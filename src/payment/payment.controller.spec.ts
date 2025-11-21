import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dtos/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../user/entities/user.entity';
import { BadRequestException, HttpStatus } from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from './entities/payment.entity';
import { UpdatePaymentDto } from './dtos/update-payment.dto';

describe('PaymentController', () => {
  let controller: PaymentController;
  let service: PaymentService;

  const mockPaymentService = {
    createStripeCheckout: jest.fn(),
    verifyStripePayment: jest.fn(),
    createManualPayment: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    handleStripeWebhook: jest.fn(),
  };

  const mockUserRequest = {
    user: { userId: 5, role: UserRole.CLIENT },
  };
  
  const mockAdminRequest = {
    user: { userId: 1, role: UserRole.ADMIN },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [{ provide: PaymentService, useValue: mockPaymentService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true }) 
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true }) 
      .compile();

    controller = module.get<PaymentController>(PaymentController);
    service = module.get<PaymentService>(PaymentService);

    jest.clearAllMocks();
  });

  // ============================
  // POST /payments/stripe/checkout
  // ============================
  describe('createStripeCheckout', () => {
    it('should call createStripeCheckout and inject the authenticated userId', async () => {
      // DTO solo con orderId
      const dto: CreatePaymentDto = { orderId: 10 }; 
      const expected = { url: 'http://checkout.url', sessionId: 'cs_123' };

      mockPaymentService.createStripeCheckout.mockResolvedValue(expected);

      await controller.createStripeCheckout(dto, mockUserRequest);

      // Verifica que el userId haya sido inyectado al DTO antes de llamar al servicio
      expect(service.createStripeCheckout).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 10, userId: 5 }),
      );
    });
  });

  // ============================
  // POST /payments/manual
  // ============================
  describe('createManualPayment', () => {
    const dtoForAdmin: CreatePaymentDto = { orderId: 10, userId: 99, amount: 50, method: PaymentMethod.CASH };
    const dtoForUser: CreatePaymentDto = { orderId: 20, amount: 60, method: PaymentMethod.TRANSFER };
    const expected = { id: 100, status: PaymentStatus.PAID };

    it('should respect DTO userId if the user is ADMIN', async () => {
      mockPaymentService.createManualPayment.mockResolvedValue(expected);
      
      // ADMIN pasa un userId diferente (99)
      await controller.createManualPayment(dtoForAdmin, mockAdminRequest); 
      
      // Verifica que se use el DTO original (userId: 99)
      expect(service.createManualPayment).toHaveBeenCalledWith(dtoForAdmin);
    });
    
    it('should inject the current userId if the user is a standard USER', async () => {
      mockPaymentService.createManualPayment.mockResolvedValue(expected);
      
      // USER no pasa userId en el DTO, o pasa uno incorrecto
      const result = await controller.createManualPayment(dtoForUser, mockUserRequest); 
      
      // Verifica que se inyecte el userId del request (5)
      expect(service.createManualPayment).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 20, userId: 5, amount: 60 }),
      );
      expect(result).toEqual(expected);
    });
  });
  
  // ============================
  // PATCH /payments/:id (ADMIN)
  // ============================
  describe('update', () => {
    it('should allow ADMIN to update payment status and method', async () => {
      const updateDto: UpdatePaymentDto = { status: PaymentStatus.REFUNDED, transactionId: 'TX123' };
      mockPaymentService.update.mockResolvedValue({ affected: 1 });

      await controller.update(10, updateDto);

      // Verifica que el servicio reciba el ID y el DTO
      expect(service.update).toHaveBeenCalledWith(10, updateDto);
    });
  });
});