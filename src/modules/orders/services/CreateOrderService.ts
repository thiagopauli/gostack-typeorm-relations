import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

interface IProductsToUpdate {
  [key: string]: number;
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer does not exists.', 400);
    }

    const productsQuantity: IProductsToUpdate = products.reduce((map, obj) => ({ ...map, [obj.id]: obj.quantity }), {});
    const productsIds = products.map(({ quantity: _, ...product }) => product);

    const productsFinded = await this.productsRepository.findAllById(productsIds);

    if (!productsFinded || productsFinded.length === 0) {
      throw new AppError('Products not found.', 400);
    }

    const productsToOrder = [];
    for (let i = 0; i < productsFinded.length; i += 1) {
      productsToOrder.push({
        product_id: productsFinded[i].id,
        price: productsFinded[i].price,
        quantity: productsQuantity[productsFinded[i].id],
      });

      const quantity = productsFinded[i].quantity - productsQuantity[productsFinded[i].id];
      if (quantity < 1) {
        throw new AppError(`Product ${productsFinded[i].name} out of stock`, 400);
      }
    }

    await this.productsRepository.updateQuantity(products);

    const order = await this.ordersRepository.create({
      customer,
      products: productsToOrder,
    });

    return order;
  }
}

export default CreateOrderService;
