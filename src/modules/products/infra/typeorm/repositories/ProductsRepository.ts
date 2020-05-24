import { getRepository, Repository } from 'typeorm';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICreateProductDTO from '@modules/products/dtos/ICreateProductDTO';
import IUpdateProductsQuantityDTO from '@modules/products/dtos/IUpdateProductsQuantityDTO';
import Product from '../entities/Product';

interface IFindProducts {
  id: string;
}

interface IProductsToUpdate {
  [key: string]: number;
}

class ProductsRepository implements IProductsRepository {
  private ormRepository: Repository<Product>;

  constructor() {
    this.ormRepository = getRepository(Product);
  }

  public async create({ name, price, quantity }: ICreateProductDTO): Promise<Product> {
    const product = this.ormRepository.create({
      name,
      price,
      quantity,
    });

    await this.ormRepository.save(product);

    return product;
  }

  public async findByName(name: string): Promise<Product | undefined> {
    const product = await this.ormRepository.findOne({
      where: { name },
    });

    return product;
  }

  public async findAllById(products: IFindProducts[]): Promise<Product[]> {
    const productsFinded = await this.ormRepository.findByIds(products);

    return productsFinded;
  }

  public async updateQuantity(products: IUpdateProductsQuantityDTO[]): Promise<Product[]> {
    const productsToUpdate: IProductsToUpdate = products.reduce((map, obj) => ({ ...map, [obj.id]: obj.quantity }), {});

    const productsList = await this.ormRepository.findByIds(Object.keys(productsToUpdate));

    if (!productsList) {
      throw new AppError('Products not found!');
    }

    for (let i = 0; i < productsList.length; i += 1) {
      const quantity = productsList[i].quantity - productsToUpdate[productsList[i].id];
      if (quantity < 1) {
        throw new AppError(`Product ${productsList[i].name} out of stock`, 400);
      }

      productsList[i].quantity = quantity;
    }

    await this.ormRepository.save(productsList);

    return productsList;
  }
}

export default ProductsRepository;
