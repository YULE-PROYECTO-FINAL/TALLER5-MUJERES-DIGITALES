import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../product/entities/product.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CartService', () => {
  let service: CartService;

  let cartRepo: any;
  let itemRepo: any;
  let productRepo: any;

  beforeEach(async () => {

    cartRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    itemRepo = {
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    productRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getRepositoryToken(Cart), useValue: cartRepo },
        { provide: getRepositoryToken(CartItem), useValue: itemRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  // =====================================================
  // findOrCreateCart
  // =====================================================
  it('should create a new cart if none exists', async () => {
    cartRepo.findOne.mockResolvedValue(null);
    cartRepo.create.mockReturnValue({ id: 1, items: [] });
    cartRepo.save.mockResolvedValue({ id: 1 });

    const result = await service.findOrCreateCart(1);

    expect(cartRepo.findOne).toHaveBeenCalled();
    expect(cartRepo.create).toHaveBeenCalled();
    expect(cartRepo.save).toHaveBeenCalled();
    expect(result.items).toEqual([]);
  });

  it('should return an existing cart', async () => {
    const existingCart = { id: 5, items: [] };

    cartRepo.findOne.mockResolvedValue(existingCart);

    const result = await service.findOrCreateCart(1);
    expect(result).toBe(existingCart);
  });

  // =====================================================
  // findOne
  // =====================================================

  it('should throw NotFoundException if cart not found', async () => {
    cartRepo.findOne.mockResolvedValue(null);

    await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
  });

  it('should return found cart', async () => {
    const cart = { id: 1 };
    cartRepo.findOne.mockResolvedValue(cart);

    expect(await service.findOne(1)).toBe(cart);
  });

  // =====================================================
  // addOrUpdateProduct
  // =====================================================

  it('should throw if quantity <= 0', async () => {
    cartRepo.findOne.mockResolvedValue({ id: 1, items: [] });

    await expect(service.addOrUpdateProduct(1, 10, 0)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw if product does not exist', async () => {
    cartRepo.findOne.mockResolvedValue({ id: 1, items: [] });
    productRepo.findOne.mockResolvedValue(null);

    await expect(service.addOrUpdateProduct(1, 999, 1)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw if quantity exceeds stock', async () => {
    cartRepo.findOne.mockResolvedValue({ id: 1, items: [] });
    productRepo.findOne.mockResolvedValue({ id: 3, cantidad: 2 });

    await expect(service.addOrUpdateProduct(1, 3, 5)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should update existing item', async () => {
    const existingItem = { product: { id: 3 }, quantity: 1 };
    const cart = { id: 1, items: [existingItem] };

    cartRepo.findOne.mockResolvedValue(cart);
    productRepo.findOne.mockResolvedValue({ id: 3, cantidad: 10 });
    itemRepo.save.mockResolvedValue(existingItem);

    const result = await service.addOrUpdateProduct(1, 3, 5);

    expect(existingItem.quantity).toBe(5);
    expect(itemRepo.save).toHaveBeenCalledWith(existingItem);
    expect(result).toBe(cart);
  });

  it('should add a new item', async () => {
    const cart = { id: 1, items: [] };
    const product = { id: 3, cantidad: 10 };

    cartRepo.findOne.mockResolvedValue(cart);
    productRepo.findOne.mockResolvedValue(product);

    const newItem = { product, quantity: 5 };
    itemRepo.create.mockReturnValue(newItem);

    const result = await service.addOrUpdateProduct(1, 3, 5);

    expect(itemRepo.create).toHaveBeenCalled();
    expect(itemRepo.save).toHaveBeenCalledWith(newItem);
    expect(result.items.length).toBe(1);
  });

  // =====================================================
  // removeProduct
  // =====================================================

  it('should remove product from cart', async () => {
    const item = { product: { id: 3 } };
    const cart = { id: 1, items: [item] };

    cartRepo.findOne.mockResolvedValueOnce(cart); // findOrCreateCart
    itemRepo.remove.mockResolvedValue(undefined);
    cartRepo.findOne.mockResolvedValueOnce({ id: 1, items: [] });

    const result = await service.removeProduct(1, 3);

    expect(itemRepo.remove).toHaveBeenCalledWith(item);
    expect(result.items).toEqual([]);
  });

  it('should throw if the product does not exist in cart', async () => {
    cartRepo.findOne.mockResolvedValue({ id: 1, items: [] });

    await expect(service.removeProduct(1, 99)).rejects.toThrow(
      NotFoundException,
    );
  });

  // =====================================================
  // checkout
  // =====================================================

  it('should throw if cart is empty', async () => {
    cartRepo.findOne.mockResolvedValue({ id: 1, items: [] });

    await expect(service.checkout(1)).rejects.toThrow(BadRequestException);
  });

  it('should throw if cart is already checked out', async () => {
    cartRepo.findOne.mockResolvedValue({ id: 1, checkedOut: true, items: [{}] });

    await expect(service.checkout(1)).rejects.toThrow(BadRequestException);
  });

  it('should checkout successfully', async () => {
    const cart = { id: 1, checkedOut: false, items: [{}] };
    cartRepo.findOne.mockResolvedValue(cart);
    cartRepo.save.mockResolvedValue({ ...cart, checkedOut: true });

    const result = await service.checkout(1);

    expect(cartRepo.save).toHaveBeenCalled();
    expect(result.checkedOut).toBe(true);
  });

  // =====================================================
  // findAll
  // =====================================================

  it('should return all carts', async () => {
    const carts = [{ id: 1 }, { id: 2 }];
    cartRepo.find.mockResolvedValue(carts);

    expect(await service.findAll()).toBe(carts);
  });
});
