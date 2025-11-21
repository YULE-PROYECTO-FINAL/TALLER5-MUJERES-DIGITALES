import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { User } from '../user/entities/user.entity';
import { Cart } from '../cart/entities/cart.entity';
import { OrderDetail } from '../order-detail/entities/order-detail.entity';
import { Product } from '../product/entities/product.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateOrderDto } from './dtos/create-order.dto';

// ---------------------------
// MOCKS TIPADOS
// ---------------------------
type MockRepository<T = any> = {
  find: jest.Mock<Promise<T[]>, any[]>;
  findOne: jest.Mock<Promise<T | null>, any[]>;
  save: jest.Mock<Promise<T>, any[]>;
  remove: jest.Mock<Promise<T>, any[]>;
  create: jest.Mock<T, any[]>;
};

const createMockRepository = <T = any>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  create: jest.fn(),
});

const createMockQueryRunner = () => ({
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  },
});

// ---------------------------
// TEST SUITE
// ---------------------------
describe('OrderService', () => {
  let service: OrderService;
  let orderRepo: MockRepository<Order>;
  let userRepo: MockRepository<User>;
  let cartRepo: MockRepository<Cart>;
  let detailRepo: MockRepository<OrderDetail>;
  let productRepo: MockRepository<Product>;
  let dataSource: DataSource;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: getRepositoryToken(Order), useValue: createMockRepository() },
        { provide: getRepositoryToken(User), useValue: createMockRepository() },
        { provide: getRepositoryToken(Cart), useValue: createMockRepository() },
        { provide: getRepositoryToken(OrderDetail), useValue: createMockRepository() },
        { provide: getRepositoryToken(Product), useValue: createMockRepository() },
        {
          provide: DataSource,
          useValue: { createQueryRunner: jest.fn().mockReturnValue(createMockQueryRunner()) },
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    orderRepo = module.get(getRepositoryToken(Order));
    userRepo = module.get(getRepositoryToken(User));
    cartRepo = module.get(getRepositoryToken(Cart));
    detailRepo = module.get(getRepositoryToken(OrderDetail));
    productRepo = module.get(getRepositoryToken(Product));
    dataSource = module.get(DataSource);
  });

  // ==============================
  // findAll
  // ==============================
  describe('findAll', () => {
    it('should return an array of orders', async () => {
      const orders: Order[] = [
        { id: 1, status: OrderStatus.PENDING, total: 100, createdAt: new Date(), user: { id: 1 } as User, details: [], cart: undefined },
        { id: 2, status: OrderStatus.PAID, total: 50, createdAt: new Date(), user: { id: 2 } as User, details: [], cart: undefined },
      ];
      orderRepo.find.mockResolvedValue(orders);

      const result = await service.findAll();

      expect(result).toEqual(orders);
      expect(orderRepo.find).toHaveBeenCalledWith({
        relations: ['user', 'details', 'details.product'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  // ==============================
  // findOne
  // ==============================
  describe('findOne', () => {
    it('should return the order if found', async () => {
      const order: Order = {
        id: 1,
        status: OrderStatus.PENDING,
        total: 100,
        createdAt: new Date(),
        user: { id: 1 } as User,
        details: [],
        cart: undefined,
      };
      orderRepo.findOne.mockResolvedValue(order);

      const result = await service.findOne(1);
      expect(result).toEqual(order);
    });

    it('should throw NotFoundException if order does not exist', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  // ==============================
  // create
  // ==============================
  describe('create', () => {
    it('should create a new order successfully', async () => {
      const queryRunner = dataSource.createQueryRunner() as any;

      const user: User = { id: 1 } as User;
      const product: Product = { id: 1, price: 10, available: true, cantidad: 5 } as Product;
      const cart: Cart = {
        id: 1,
        user: user,
        checkedOut: true,
        items: [
          {
            product: product,
            quantity: 2,
          },
        ],
      } as Cart;

      queryRunner.manager.findOne.mockImplementation((entity) => {
        if (entity === User) return Promise.resolve(user);
        if (entity === Cart) return Promise.resolve(cart);
        if (entity === Product) return Promise.resolve(product);
        return Promise.resolve(null);
      });

      queryRunner.manager.create.mockImplementation((entity, dto) => ({ ...dto, id: 1 }));
      queryRunner.manager.save.mockImplementation(async (entity) => ({ ...entity, id: 1 }));

      // 🔥 FIX: mockear findOne para evitar NotFoundException
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1,
        status: OrderStatus.PENDING,
        total: 20,
        createdAt: new Date(),
        user: user,
        details: [],
        cart: undefined,
      });

      const result = await service.create(1, { cartId: 1 } as CreateOrderDto);

      expect(result).toBeDefined();
      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      const queryRunner = dataSource.createQueryRunner() as any;
      queryRunner.manager.findOne.mockResolvedValueOnce(null);

      await expect(service.create(1, { cartId: 1 } as CreateOrderDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==============================
  // updateStatus
  // ==============================
  describe('updateStatus', () => {
    it('should update status to CANCELLED for client', async () => {
      const order: Order = {
        id: 1,
        status: OrderStatus.PENDING,
        total: 100,
        createdAt: new Date(),
        user: { id: 1 } as User,
        details: [],
        cart: undefined,
      };

      orderRepo.findOne.mockResolvedValue(order);
      orderRepo.save.mockResolvedValue({ ...order, status: OrderStatus.CANCELLED });

      const result = await service.updateStatus(1, OrderStatus.CANCELLED, 1);

      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should throw ForbiddenException if client tries to update to PAID', async () => {
      const order: Order = {
        id: 1,
        status: OrderStatus.PENDING,
        total: 100,
        createdAt: new Date(),
        user: { id: 1 } as User,
        details: [],
        cart: undefined,
      };

      orderRepo.findOne.mockResolvedValue(order);

      await expect(service.updateStatus(1, OrderStatus.PAID, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ==============================
  // remove
  // ==============================
  describe('remove', () => {
    it('should remove an order successfully', async () => {
      const order: Order = {
        id: 1,
        status: OrderStatus.PENDING,
        total: 100,
        createdAt: new Date(),
        user: { id: 1 } as User,
        details: [],
        cart: undefined,
      };

      orderRepo.findOne.mockResolvedValue(order);
      orderRepo.remove.mockResolvedValue(order);

      const result = await service.remove(1);

      expect(result).toEqual({ message: 'Order 1 deleted successfully' });
    });
  });
});
