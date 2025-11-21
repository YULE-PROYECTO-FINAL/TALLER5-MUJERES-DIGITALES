import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dtos/add-cart-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('CartController', () => {
  let controller: CartController;
  let service: CartService;

  const mockCartService = {
    findOrCreateCart: jest.fn(),
    addOrUpdateProduct: jest.fn(),
    removeProduct: jest.fn(),
    checkout: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  const mockRequest = {
    user: { userId: 5 }, // ID del usuario autenticado
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [{ provide: CartService, useValue: mockCartService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CartController>(CartController);
    service = module.get<CartService>(CartService);

    jest.clearAllMocks();
  });

  // ================================
  // GET /carts/my
  // ================================
  it('should return the user cart (findOrCreateCart)', async () => {
    const expected = { id: 10, userId: 5 };
    mockCartService.findOrCreateCart.mockResolvedValue(expected);

    const result = await controller.getCart(mockRequest as any);

    expect(service.findOrCreateCart).toHaveBeenCalledWith(5);
    expect(result).toEqual(expected);
  });

  // ================================
  // POST /carts/item
  // ================================
  it('should add or update a cart item', async () => {
    const dto: AddCartItemDto = { productId: 99, quantity: 3 };
    const expected = { id: 10, items: [{ productId: 99, qty: 3 }] };

    mockCartService.addOrUpdateProduct.mockResolvedValue(expected);

    const result = await controller.addItem(mockRequest as any, dto);

    expect(service.addOrUpdateProduct).toHaveBeenCalledWith(5, 99, 3);
    expect(result).toEqual(expected);
  });

  // ================================
  // DELETE /carts/item/:productId
  // ================================
  it('should remove a product from the cart', async () => {
    const expected = { message: 'Product removed' };

    mockCartService.removeProduct.mockResolvedValue(expected);

    const result = await controller.removeItem(mockRequest as any, 99);

    expect(service.removeProduct).toHaveBeenCalledWith(5, 99);
    expect(result).toEqual(expected);
  });

  // ================================
  // PATCH /carts/checkout
  // ================================
  it('should checkout a cart', async () => {
    const mockCart = { id: 10 };
    const expected = { message: 'Cart checked out' };

    mockCartService.findOrCreateCart.mockResolvedValue(mockCart);
    mockCartService.checkout.mockResolvedValue(expected);

    const result = await controller.checkout(mockRequest as any);

    expect(service.findOrCreateCart).toHaveBeenCalledWith(5);
    expect(service.checkout).toHaveBeenCalledWith(10);
    expect(result).toEqual(expected);
  });

  // ================================
  // GET /carts (ADMIN)
  // ================================
  it('should return all carts', async () => {
    const expected = [{ id: 1 }, { id: 2 }];
    mockCartService.findAll.mockResolvedValue(expected);

    const result = await controller.findAll();

    expect(service.findAll).toHaveBeenCalled();
    expect(result).toEqual(expected);
  });

  // ================================
  // GET /carts/:id (ADMIN)
  // ================================
  it('should return one cart by id', async () => {
    const expected = { id: 10 };
    mockCartService.findOne.mockResolvedValue(expected);

    const result = await controller.findOne(10);

    expect(service.findOne).toHaveBeenCalledWith(10);
    expect(result).toEqual(expected);
  });
});
