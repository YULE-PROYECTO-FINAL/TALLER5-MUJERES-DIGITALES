
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { OrderService } from '../order/order.service'; 
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Payment, PaymentMethod, PaymentStatus } from './entities/payment.entity';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreatePaymentDto } from './dtos/create-payment.dto';
import { OrderStatus } from '../order/entities/order.entity'; 
import Stripe from 'stripe';

// Mock de Stripe
const mockStripe = {
  checkout: {
    sessions: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepository: Repository<Payment>;
  let orderService: OrderService;

  const mockPaymentRepository = {
    // Definimos los mocks de los métodos del TypeORM Repository
    save: jest.fn(),
    findOneBy: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
  };

  const mockOrderService = {
    // Definimos los mocks de los métodos de OrderService
    findOne: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'STRIPE_SECRET_KEY') return 'sk_test_mock';
      if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_mock';
      if (key === 'FRONTEND_URL') return 'http://localhost:3000';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: getRepositoryToken(Payment), useValue: mockPaymentRepository },
        { provide: OrderService, useValue: mockOrderService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    paymentRepository = module.get<Repository<Payment>>(getRepositoryToken(Payment));
    orderService = module.get<OrderService>(OrderService);
    
    // Sobrescribir la instancia real de Stripe con el mock
    (service as any).stripe = mockStripe;

    jest.clearAllMocks();
  });

  // ==========================================
  // createStripeCheckout (POST /payments/stripe/checkout)
  // ==========================================
  describe('createStripeCheckout', () => {
    const dto: CreatePaymentDto = { orderId: 1, userId: 5 };
    const mockOrder = { 
        id: 1, 
        total: 100.00, 
        user: { id: 5, email: 'user@example.com' } 
    };
    const mockPayment = { id: 10, orderId: 1, userId: 5, status: PaymentStatus.PENDING };
    const mockSession = { 
        id: 'cs_test_mock_id', 
        url: 'http://stripe.checkout.url' 
    };

    it('should create a PENDING payment and a Stripe session URL', async () => {
      mockOrderService.findOne.mockResolvedValue(mockOrder);
      mockPaymentRepository.save.mockResolvedValue(mockPayment);
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);
      mockPaymentRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.createStripeCheckout(dto);

      expect(mockOrderService.findOne).toHaveBeenCalledWith(dto.orderId);
      // Verifica que el método sea STRIPE y el estado PENDING
      expect(mockPaymentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 1,
          userId: 5,
          amount: 100.00,
          method: PaymentMethod.STRIPE,
          status: PaymentStatus.PENDING,
        }),
      );
      // Verifica que el update guarde el Session ID
      expect(mockPaymentRepository.update).toHaveBeenCalledWith(mockPayment.id, {
        stripeSessionId: mockSession.id,
      });
      expect(result).toEqual({ url: mockSession.url, sessionId: mockSession.id });
    });

    it('should mark payment as CANCELLED if Stripe session creation fails', async () => {
      mockOrderService.findOne.mockResolvedValue(mockOrder);
      mockPaymentRepository.save.mockResolvedValue(mockPayment);
      mockStripe.checkout.sessions.create.mockRejectedValue(new Error('Stripe API error'));

      await expect(service.createStripeCheckout(dto)).rejects.toThrow(BadRequestException);
      // Verifica que el estado se actualice a CANCELLED si Stripe falla
      expect(mockPaymentRepository.update).toHaveBeenCalledWith(mockPayment.id, {
        status: PaymentStatus.CANCELLED,
      });
    });
  });

  // ==========================================
  // verifyStripePayment (GET /payments/verify)
  // ==========================================
  describe('verifyStripePayment', () => {
    const sessionId = 'cs_test_mock_id';
    const paymentId = 10;
    const orderId = 1;
    const mockLocalPayment = { id: paymentId, orderId: orderId, status: PaymentStatus.PENDING };

    it('should update statuses to PAID if Stripe session is complete and paid', async () => {
      const mockSession: Partial<Stripe.Checkout.Session> = {
        payment_status: 'paid',
        status: 'complete',
        metadata: { paymentId: paymentId.toString(), orderId: orderId.toString() },
        payment_intent: 'pi_mock_id',
      };

      mockStripe.checkout.sessions.retrieve.mockResolvedValue(mockSession);
      mockPaymentRepository.findOneBy.mockResolvedValue(mockLocalPayment);
      mockPaymentRepository.update.mockResolvedValue({ affected: 1 });
      mockOrderService.updateStatus.mockResolvedValue({});

      const result = await service.verifyStripePayment(sessionId);

      // Verifica que se guarde el ID del Payment Intent y el estado PAID
      expect(mockPaymentRepository.update).toHaveBeenCalledWith(paymentId, {
        status: PaymentStatus.PAID,
        stripePaymentIntentId: 'pi_mock_id',
      });
      // Verifica que se actualice el estado de la orden
      expect(mockOrderService.updateStatus).toHaveBeenCalledWith(orderId, OrderStatus.PAID);
      expect(result.status).toEqual(PaymentStatus.PAID);
    });
    
    it('should update statuses to FAILED if payment is cancelled or incomplete', async () => {
      const mockSession: Partial<Stripe.Checkout.Session> = {
        payment_status: 'unpaid',
        status: 'expired', // Nuevo estado que fuerza FAILED
        metadata: { paymentId: paymentId.toString(), orderId: orderId.toString() },
        payment_intent: null,
      };

      mockStripe.checkout.sessions.retrieve.mockResolvedValue(mockSession);
      mockPaymentRepository.findOneBy.mockResolvedValue(mockLocalPayment);
      mockPaymentRepository.update.mockResolvedValue({ affected: 1 });
      mockOrderService.updateStatus.mockResolvedValue({});

      const result = await service.verifyStripePayment(sessionId);

      // Verifica que el estado cambie a FAILED
      expect(mockPaymentRepository.update).toHaveBeenCalledWith(paymentId, {
        status: PaymentStatus.FAILED,
        stripePaymentIntentId: null, // payment_intent es null
      });
      // Verifica que la Orden se CANCELLE
      expect(mockOrderService.updateStatus).toHaveBeenCalledWith(orderId, OrderStatus.CANCELLED);
      expect(result.status).toEqual(PaymentStatus.FAILED);
    });
  });
  
  // ==========================================
// handleStripeWebhook (POST /payments/webhook)
// ==========================================
describe('handleStripeWebhook', () => {
  const rawBody = Buffer.from('event body');
  const signature = 't=12345,v1=mock_signature';

  it('should update OrderStatus to PAID on payment_intent.succeeded', async () => {
    const orderId = 1;
    const paymentId = 10;
    
    // Usamos Partial<Stripe.PaymentIntent> y definimos las propiedades mínimas necesarias
    const paymentIntentMock: Partial<Stripe.PaymentIntent> = {
      metadata: { 
          orderId: orderId.toString(), 
          paymentId: paymentId.toString() 
      },
      id: 'pi_mock_id',
      object: 'payment_intent',
      amount: 10000, 
    };
    
    // Definición de mockEvent
    const mockEvent: Stripe.Event = {
      type: 'payment_intent.succeeded',
      data: {
        object: paymentIntentMock as Stripe.PaymentIntent, 
      },
    } as Stripe.Event; 

    mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
    mockOrderService.updateStatus.mockResolvedValue({});
    mockPaymentRepository.update.mockResolvedValue({ affected: 1 });
    
    await service.handleStripeWebhook(rawBody, signature);

    expect(mockOrderService.updateStatus).toHaveBeenCalledWith(orderId, OrderStatus.PAID);
    expect(mockOrderService.updateStatus).toHaveBeenCalledTimes(1);
  });
  
  it('should update OrderStatus to CANCELLED on payment_intent.payment_failed', async () => {
    const orderId = 2;
    
    const failedPaymentIntentMock: Partial<Stripe.PaymentIntent> = {
      metadata: { 
          orderId: orderId.toString(),
      },
      id: 'pi_failed_mock',
      object: 'payment_intent',
      amount: 10000, // Añadir amount para completar el mock
    };

    // Definición de mockEvent
    const mockEvent: Stripe.Event = {
      type: 'payment_intent.payment_failed',
      data: {
        object: failedPaymentIntentMock as Stripe.PaymentIntent,
      },
    } as Stripe.Event; 

    mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
    mockOrderService.updateStatus.mockResolvedValue({});

    await service.handleStripeWebhook(rawBody, signature);

    expect(mockOrderService.updateStatus).toHaveBeenCalledWith(orderId, OrderStatus.CANCELLED);
  }); // Cierre del describe('handleStripeWebhook')
}); 
});