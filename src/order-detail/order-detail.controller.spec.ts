import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, NotFoundException } from '@nestjs/common'; // <-- ¡IMPORTADO AQUÍ!
import request from 'supertest'; // <-- CORREGIDO AQUÍ (default import)
import { OrderDetailController } from './order-detail.controller';
import { OrderDetailService } from './order-detail.service';
import { CreateOrderDetailDto } from './dtos/create-order-detail.dto';
import { UpdateOrderDetailDto } from './dtos/update-order-detail.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../user/entities/user.entity';

// Mock OrderDetailService (Mismo que antes)
const mockOrderDetailService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

// Mock Guards to bypass authentication and authorization checks for simplicity
const mockAuthGuard = {
  canActivate: jest.fn((context) => {
    // Simulate an authenticated user with ADMIN role (needed for findAll/remove)
    context.switchToHttp().getRequest().user = { userId: 1, role: UserRole.ADMIN };
    return true; 
  }),
};

const mockRolesGuard = {
    canActivate: jest.fn(() => true),
};


describe('OrderDetailController (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OrderDetailController],
      providers: [
        {
          provide: OrderDetailService,
          useValue: mockOrderDetailService,
        },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue(mockAuthGuard)
    .overrideGuard(RolesGuard)
    .useValue(mockRolesGuard)
    .compile();

    app = moduleFixture.createNestApplication();
    // Use ValidationPipe to test DTO validation
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true })); 
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // 🧪 FIND ALL
  // ============================================================
  describe('GET /order-details', () => {
    /**
     * Test: Should return status 200 and the array of details (requires ADMIN role).
     */
    it('should return an array of order details (status 200)', async () => {
      // Arrange
      const mockDetails = [{ id: 1, quantity: 1 }];
      mockOrderDetailService.findAll.mockResolvedValue(mockDetails);

      // Act
      const response = await request(app.getHttpServer()) // <-- AHORA FUNCIONA
        .get('/order-details')
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockDetails);
      expect(mockOrderDetailService.findAll).toHaveBeenCalled();
    });
  });

  // ============================================================
  // 🧪 FIND ONE
  // ============================================================
  describe('GET /order-details/:id', () => {
    /**
     * Test: Should return status 200 and the specific order detail by ID.
     */
    it('should return a single order detail (status 200)', async () => {
      // Arrange
      const mockDetail = { id: 1, quantity: 1 };
      mockOrderDetailService.findOne.mockResolvedValue(mockDetail);

      // Act
      const response = await request(app.getHttpServer())
        .get('/order-details/1')
        .expect(200);

      // Assert
      expect(response.body).toEqual(mockDetail);
      expect(mockOrderDetailService.findOne).toHaveBeenCalledWith(1);
    });

    /**
     * Test: Should return status 404 if the service throws NotFoundException.
     */
    it('should return 404 if order detail is not found', async () => {
        // Arrange
        // Usamos la clase NotFoundException importada
        mockOrderDetailService.findOne.mockRejectedValue(new NotFoundException('Order detail 999 not found')); 
  
        // Act
        const response = await request(app.getHttpServer())
          .get('/order-details/999')
          .expect(404);
  
        // Assert
        expect(response.body.message).toBe('Order detail 999 not found');
      });

    /**
     * Test: Should return status 400 for invalid ID format (ParseIntPipe check).
     */
    it('should return 400 for invalid ID format', async () => {
        // Arrange (Handled by NestJS Pipes)
  
        // Act & Assert
        await request(app.getHttpServer())
          .get('/order-details/invalid')
          .expect(400);
      });
  });

  // ============================================================
  // 🧪 CREATE
  // ============================================================
  describe('POST /order-details', () => {
    const createDto: CreateOrderDetailDto = { orderId: 1, productId: 5, quantity: 2 };
    const createdDetail = { id: 3, ...createDto, subtotal: 30.0 };

    /**
     * Test: Should return status 201 and the created entity upon successful creation.
     */
    it('should create a new order detail (status 201)', async () => {
      // Arrange
      mockOrderDetailService.create.mockResolvedValue(createdDetail);

      // Act
      const response = await request(app.getHttpServer())
        .post('/order-details')
        .send(createDto)
        .expect(201);

      // Assert
      expect(response.body).toEqual(createdDetail);
      expect(mockOrderDetailService.create).toHaveBeenCalledWith(createDto);
    });

    /**
     * Test: Should return status 400 for DTO validation failure (e.g., quantity minimum constraint).
     */
    it('should return 400 for invalid DTO (quantity < 1)', async () => {
      // Arrange
      const invalidDto = { orderId: 1, productId: 5, quantity: 0 };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/order-details')
        .send(invalidDto)
        .expect(400);
      expect(mockOrderDetailService.create).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 🧪 UPDATE
  // ============================================================
  describe('PATCH /order-details/:id', () => {
    const updateDto: UpdateOrderDetailDto = { quantity: 5 };
    const updatedDetail = { id: 1, quantity: 5, subtotal: 50.0 };

    /**
     * Test: Should return status 200 and the updated entity.
     */
    it('should update an order detail (status 200)', async () => {
      // Arrange
      mockOrderDetailService.update.mockResolvedValue(updatedDetail);

      // Act
      const response = await request(app.getHttpServer())
        .patch('/order-details/1')
        .send(updateDto)
        .expect(200);

      // Assert
      expect(response.body).toEqual(updatedDetail);
      expect(mockOrderDetailService.update).toHaveBeenCalledWith(1, updateDto);
    });

    /**
     * Test: Should return status 400 for update DTO validation failure.
     */
    it('should return 400 for invalid update DTO (quantity is not integer)', async () => {
      // Arrange
      const invalidUpdateDto = { quantity: 5.5 };

      // Act & Assert
      await request(app.getHttpServer())
        .patch('/order-details/1')
        .send(invalidUpdateDto)
        .expect(400);
      expect(mockOrderDetailService.update).not.toHaveBeenCalled();
    });
    
    /**
     * Test: Should return status 404 if the service throws NotFoundException during update.
     */
    it('should return 404 if order detail is not found during update', async () => {
        // Arrange
        mockOrderDetailService.update.mockRejectedValue(new NotFoundException('Order detail 999 not found'));
  
        // Act
        const response = await request(app.getHttpServer())
          .patch('/order-details/999')
          .send(updateDto)
          .expect(404);
  
        // Assert
        expect(response.body.message).toBe('Order detail 999 not found');
      });
  });

  // ============================================================
  // 🧪 REMOVE
  // ============================================================
  describe('DELETE /order-details/:id', () => {
    /**
     * Test: Should return status 200 and a success message upon successful deletion (requires ADMIN role).
     */
    it('should delete an order detail (status 200)', async () => {
      // Arrange
      const deleteResult = { message: 'Order detail 1 deleted successfully' };
      mockOrderDetailService.remove.mockResolvedValue(deleteResult);

      // Act
      const response = await request(app.getHttpServer())
        .delete('/order-details/1')
        .expect(200);

      // Assert
      expect(response.body).toEqual(deleteResult);
      expect(mockOrderDetailService.remove).toHaveBeenCalledWith(1);
    });
    
    /**
     * Test: Should return status 404 if the service throws NotFoundException during deletion.
     */
    it('should return 404 if order detail is not found during delete', async () => {
        // Arrange
        mockOrderDetailService.remove.mockRejectedValue(new NotFoundException('Order detail 999 not found'));
  
        // Act
        const response = await request(app.getHttpServer())
          .delete('/order-details/999')
          .expect(404);
  
        // Assert
        expect(response.body.message).toBe('Order detail 999 not found');
      });
  });
});