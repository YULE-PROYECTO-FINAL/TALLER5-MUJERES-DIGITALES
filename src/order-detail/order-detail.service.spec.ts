import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { OrderDetailService } from './order-detail.service';
import { OrderDetail } from './entities/order-detail.entity';
import { CreateOrderDetailDto } from './dtos/create-order-detail.dto';
import { UpdateOrderDetailDto } from './dtos/update-order-detail.dto';
import { Order } from '../order/entities/order.entity';
import { Product } from '../product/entities/product.entity';

// Mock Data
const mockProduct: Product = { id: 1, price: 10.0 } as any; 
// 💡 MOCK de Order: Debe tener la propiedad 'details' para que el servicio pueda recalcular el total
const mockOrder: Order = { id: 1, details: [] } as any;  
const mockOrderPromise: Promise<Order> = Promise.resolve(mockOrder); 

const mockOrderDetail: OrderDetail = {
  id: 1,
  quantity: 2,
  unitPrice: mockProduct.price,
  subtotal: 20.0,
  orderId: mockOrder.id as number, // Aseguramos que sea number
  order: mockOrderPromise,
  product: mockProduct,
};


// Mock Repositories
const mockDetailRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

const mockOrderRepository = {
  findOne: jest.fn(),
  // 💡 Necesitamos simular la función save también, ya que el servicio la usa para actualizar el total
  save: jest.fn(), 
};

const mockProductRepository = {
  findOne: jest.fn(),
};

describe('OrderDetailService', () => {
  let service: OrderDetailService;
  let detailRepo: Repository<OrderDetail>;
  let orderRepo: Repository<Order>;
  let productRepo: Repository<Product>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderDetailService,
        {
          provide: getRepositoryToken(OrderDetail),
          useValue: mockDetailRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository, // Asegúrate de que el mockOrderRepository incluye save
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
      ],
    }).compile();

    service = module.get<OrderDetailService>(OrderDetailService);
    detailRepo = module.get<Repository<OrderDetail>>(getRepositoryToken(OrderDetail));
    orderRepo = module.get<Repository<Order>>(getRepositoryToken(Order));
    productRepo = module.get<Repository<Product>>(getRepositoryToken(Product));
    
    // Clear mocks before each test
    jest.clearAllMocks(); 
  });
// ... (Métodos findAll, findOne, create, update, etc., quedan igual) ...

  // ============================================================
  // 🧪 REMOVE 
  // ============================================================
  describe('remove', () => {
    // Definimos una orden con detalles antes de la eliminación
    const mockOrderWithDetails: Order = {
        id: 1,
        details: [mockOrderDetail as OrderDetail], // Array simulado de detalles
        // Añade otras propiedades de Order si son obligatorias (ej. total)
        total: 20.0
    } as any;

    // Orden simulada después de eliminar el único detalle
    const mockOrderAfterRemoval: Order = { 
        id: 1, 
        details: [], 
        total: 0.0 // El total después de la eliminación
    } as any; 

    /**
     * Test: Should successfully remove an existing order detail and return a success message.
     */
    it('should successfully remove an order detail and update the order total', async () => {
      // Arrange
      // 1. Simular que el detalle existe
      jest.spyOn(service, 'findOne').mockResolvedValue(mockOrderDetail);
      
      // 2. Simular que la orden es cargada con SUS DETALLES para poder recalcular el total
      // El servicio llama a orderRepo.findOne para obtener la orden después de la eliminación.
      // Debe devolver la orden con los 'details' (los detalles restantes, que en este caso son []).
      mockOrderRepository.findOne.mockResolvedValue(mockOrderAfterRemoval);
      
      // 3. Simular que el repositorio de ordenes guarda el nuevo total
      mockOrderRepository.save.mockResolvedValue(mockOrderAfterRemoval);

      // Act
      const result = await service.remove(1);

      // Assert
      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(detailRepo.remove).toHaveBeenCalledWith(mockOrderDetail);
      // El servicio debería haber llamado a findOne en el repositorio de órdenes para recalcular el total
      expect(orderRepo.findOne).toHaveBeenCalled(); 
      // El servicio debería haber guardado la orden con el total actualizado
      expect(orderRepo.save).toHaveBeenCalledWith(expect.objectContaining({ total: 0.0 })); 
      expect(result).toEqual({ message: 'Order detail 1 deleted successfully' });
    });

    /**
     * Test: Should throw NotFoundException if order detail to remove is not found.
     */
    it('should throw NotFoundException if order detail is not found', async () => {
      // Arrange
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException('Order detail 999 not found'));

      // Act & Assert
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(detailRepo.remove).not.toHaveBeenCalled();
    });
  });
});