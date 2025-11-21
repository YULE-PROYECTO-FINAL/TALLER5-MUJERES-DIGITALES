// =====================================================
// Invoice Controller - Test
// =====================================================
import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dtos/create-invoice.dto';
import { UpdateInvoiceDto } from './dtos/update-invoice.dto';

describe('InvoiceController', () => {
  let controller: InvoiceController;
  let service: InvoiceService;

  // ============================
  // MOCK SERVICE
  // ============================
  const mockInvoiceService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    cancel: jest.fn(),
  };

  // ============================
  // SETUP
  // ============================
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoiceController],
      providers: [
        {
          provide: InvoiceService,
          useValue: mockInvoiceService,
        },
      ],
    }).compile();

    controller = module.get<InvoiceController>(InvoiceController);
    service = module.get<InvoiceService>(InvoiceService);
    jest.clearAllMocks();
  });

  // ============================
  // TEST: DEFINITION
  // ============================
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============================
  // TEST: CREATE (AAA)
  // ============================
  describe('create', () => {
    it('should create an invoice (AAA)', async () => {
      // Arrange
      const dto: CreateInvoiceDto = {
        userId: 1,
        orderId: 10,
        paymentId: 20,
        totalAmount: 100000,
        invoiceNumber: 'INV-001',
      };
      const mockResult = { id: 1, ...dto };

      mockInvoiceService.create.mockResolvedValue(mockResult);

      // Act
      const result = await controller.create(dto);

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockInvoiceService.create).toHaveBeenCalledWith(dto);
      expect(mockInvoiceService.create).toHaveBeenCalledTimes(1);
    });
  });

  // ============================
  // TEST: FIND ALL (AAA)
  // ============================
  describe('findAll', () => {
    it('should return all invoices (AAA)', async () => {
      // Arrange
      const mockInvoices = [{ id: 1 }, { id: 2 }];
      mockInvoiceService.findAll.mockResolvedValue(mockInvoices);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result).toEqual(mockInvoices);
      expect(mockInvoiceService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  // ============================
  // TEST: FIND ONE (AAA)
  // ============================
  describe('findOne', () => {
    it('should return one invoice (AAA)', async () => {
      // Arrange
      const id = 1;
      const mockInvoice = { id, totalAmount: 100000 };
      mockInvoiceService.findOne.mockResolvedValue(mockInvoice);

      // Act
      const result = await controller.findOne(id); // number, no toString

      // Assert
      expect(result).toEqual(mockInvoice);
      expect(mockInvoiceService.findOne).toHaveBeenCalledWith(id);
    });
  });

  // ============================
  // TEST: UPDATE (AAA)
  // ============================
  describe('update', () => {
    it('should update an invoice (AAA)', async () => {
      // Arrange
      const id = 1;
      const dto: UpdateInvoiceDto = { totalAmount: 120000 };
      const mockInvoice = { id, ...dto };
      mockInvoiceService.update.mockResolvedValue(mockInvoice);

      // Act
      const result = await controller.update(id, dto); // number, no toString

      // Assert
      expect(result).toEqual(mockInvoice);
      expect(mockInvoiceService.update).toHaveBeenCalledWith(id, dto);
    });
  });

  // ============================
  // TEST: REMOVE (AAA)
  // ============================
  describe('remove', () => {
    it('should remove an invoice (AAA)', async () => {
      // Arrange
      const id = 1;
      const mockResult = { message: `Invoice ${id} deleted successfully` };
      mockInvoiceService.remove.mockResolvedValue(mockResult);

      // Act
      const result = await controller.remove(id); // number

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockInvoiceService.remove).toHaveBeenCalledWith(id);
    });
  });
});
