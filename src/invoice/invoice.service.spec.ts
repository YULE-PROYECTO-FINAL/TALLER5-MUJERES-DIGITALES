// =====================================================
// Invoice Service - Test
// =====================================================
import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceService } from './invoice.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { User } from '../user/entities/user.entity';
import { Order, OrderStatus } from '../order/entities/order.entity';
import { Payment } from '../payment/entities/payment.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateInvoiceDto } from './dtos/create-invoice.dto';
import { UpdateInvoiceDto } from './dtos/update-invoice.dto';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let invoiceRepo: jest.Mocked<Repository<Invoice>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let orderRepo: jest.Mocked<Repository<Order>>;
  let paymentRepo: jest.Mocked<Repository<Payment>>;

  // ============================
  // SETUP
  // ============================
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: getRepositoryToken(Invoice), useValue: { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(), remove: jest.fn() } },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(Order), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(Payment), useValue: { findOne: jest.fn() } },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
    invoiceRepo = module.get(getRepositoryToken(Invoice));
    userRepo = module.get(getRepositoryToken(User));
    orderRepo = module.get(getRepositoryToken(Order));
    paymentRepo = module.get(getRepositoryToken(Payment));

    jest.clearAllMocks();
  });

  // ============================
  // TEST: FIND ALL (AAA)
  // ============================
  describe('findAll', () => {
    it('should return all invoices (AAA)', async () => {
      // Arrange
      const mockInvoices = [{ id: 1 }, { id: 2 }] as Invoice[];
      invoiceRepo.find.mockResolvedValue(mockInvoices);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(mockInvoices);
      expect(invoiceRepo.find).toHaveBeenCalledTimes(1);
    });
  });

  // ============================
  // TEST: FIND ONE (AAA)
  // ============================
  describe('findOne', () => {
    it('should return one invoice (AAA)', async () => {
      // Arrange
      const id = 1;
      const mockInvoice = { id, totalAmount: 1000 } as Invoice;
      invoiceRepo.findOne.mockResolvedValue(mockInvoice);

      // Act
      const result = await service.findOne(id);

      // Assert
      expect(result).toEqual(mockInvoice);
      expect(invoiceRepo.findOne).toHaveBeenCalledWith({ where: { id }, relations: ['user', 'order', 'payment'] });
    });

    it('should throw NotFoundException if invoice does not exist (AAA)', async () => {
      // Arrange
      invoiceRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ============================
  // TEST: CREATE (AAA)
  // ============================
  describe('create', () => {
    const dto: CreateInvoiceDto = {
      userId: 1,
      orderId: 10,
      paymentId: 20,
      totalAmount: 500,
      invoiceNumber: 'INV-001',
    };

    const mockUser = { id: 1 } as User;
    const mockOrder = { id: 10, status: OrderStatus.PAID, total: 500, user: mockUser } as unknown as Order;
    const mockPayment = { id: 20 } as Payment;

    it('should create an invoice (AAA)', async () => {
      // Arrange
      userRepo.findOne.mockResolvedValue(mockUser);
      orderRepo.findOne.mockResolvedValue(mockOrder);
      paymentRepo.findOne.mockResolvedValue(mockPayment);
      invoiceRepo.findOne.mockResolvedValue(null); // no existing invoice
      invoiceRepo.create.mockImplementation((inv) => inv as Invoice);
      invoiceRepo.save.mockResolvedValue({ id: 1, ...dto, user: mockUser, order: mockOrder, payment: mockPayment, status: InvoiceStatus.ISSUED } as Invoice);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result).toMatchObject({ invoiceNumber: 'INV-001', totalAmount: 500 });
      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: dto.userId } });
      expect(orderRepo.findOne).toHaveBeenCalled();
      expect(paymentRepo.findOne).toHaveBeenCalled();
      expect(invoiceRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should throw if order is not PAID (AAA)', async () => {
      // Arrange
      orderRepo.findOne.mockResolvedValue({ ...mockOrder, status: OrderStatus.PENDING });
      userRepo.findOne.mockResolvedValue(mockUser);
      paymentRepo.findOne.mockResolvedValue(mockPayment);

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(
        'Cannot issue invoice: Order is not marked as PAID.',
      );
    });

    it('should throw if invoice total does not match order total (AAA)', async () => {
      // Arrange
      orderRepo.findOne.mockResolvedValue({ ...mockOrder, total: 600 });
      userRepo.findOne.mockResolvedValue(mockUser);
      paymentRepo.findOne.mockResolvedValue(mockPayment);

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(
        'Total amount on invoice must match the order total.',
      );
    });

    it('should throw if invoice number already exists (AAA)', async () => {
      // Arrange
      userRepo.findOne.mockResolvedValue(mockUser);
      orderRepo.findOne.mockResolvedValue(mockOrder);
      paymentRepo.findOne.mockResolvedValue(mockPayment);
      invoiceRepo.findOne.mockResolvedValue({ id: 2 } as Invoice);

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(
        `Invoice number ${dto.invoiceNumber} already exists.`,
      );
    });
  });

  // ============================
  // TEST: UPDATE (AAA)
  // ============================
  describe('update', () => {
    it('should update an invoice (AAA)', async () => {
      // Arrange
      const dto: UpdateInvoiceDto = { totalAmount: 700 };
      const mockInvoice = { id: 1, status: InvoiceStatus.ISSUED, totalAmount: 500 } as Invoice;
      jest.spyOn(service, 'findOne').mockResolvedValue(mockInvoice);
      invoiceRepo.save.mockResolvedValue({ ...mockInvoice, ...dto });

      // Act
      const result = await service.update(1, dto);

      // Assert
      expect(result.totalAmount).toEqual(700);
    });

    it('should throw if invoice is not ISSUED (AAA)', async () => {
      const mockInvoice = { id: 1, status: InvoiceStatus.CANCELLED } as Invoice;
      jest.spyOn(service, 'findOne').mockResolvedValue(mockInvoice);

      await expect(service.update(1, { totalAmount: 100 })).rejects.toThrow(
        'Cannot update a non-issued invoice.',
      );
    });
  });

  // ============================
  // TEST: CANCEL (AAA)
  // ============================
  describe('cancel', () => {
    it('should cancel an invoice (AAA)', async () => {
      const mockInvoice = { id: 1, status: InvoiceStatus.ISSUED } as Invoice;
      jest.spyOn(service, 'findOne').mockResolvedValue(mockInvoice);
      invoiceRepo.save.mockResolvedValue({ ...mockInvoice, status: InvoiceStatus.CANCELLED, cancellationDate: new Date() });

      const result = await service.cancel(1);

      expect(result.status).toBe(InvoiceStatus.CANCELLED);
      expect(result.cancellationDate).toBeDefined();
    });

    it('should throw if invoice already cancelled (AAA)', async () => {
      const mockInvoice = { id: 1, status: InvoiceStatus.CANCELLED } as Invoice;
      jest.spyOn(service, 'findOne').mockResolvedValue(mockInvoice);

      await expect(service.cancel(1)).rejects.toThrow('Invoice is already cancelled.');
    });
  });

  // ============================
  // TEST: REMOVE (AAA)
  // ============================
  describe('remove', () => {
    it('should remove a non-issued invoice (AAA)', async () => {
      const mockInvoice = { id: 1, status: InvoiceStatus.CANCELLED } as Invoice;
      jest.spyOn(service, 'findOne').mockResolvedValue(mockInvoice);
      invoiceRepo.remove.mockResolvedValue(mockInvoice);

      const result = await service.remove(1);
      expect(result).toEqual({ message: 'Invoice 1 deleted successfully' });
    });

    it('should throw if invoice is ISSUED (AAA)', async () => {
      const mockInvoice = { id: 1, status: InvoiceStatus.ISSUED } as Invoice;
      jest.spyOn(service, 'findOne').mockResolvedValue(mockInvoice);

      await expect(service.remove(1)).rejects.toThrow(
        'Cannot delete an issued invoice. Please cancel it first.',
      );
    });
  });
});
