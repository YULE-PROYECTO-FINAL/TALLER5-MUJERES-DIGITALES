import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from './entities/invoice.entity'; 
import { CreateInvoiceDto } from './dtos/create-invoice.dto';
import { UpdateInvoiceDto } from './dtos/update-invoice.dto';
import { User } from '../user/entities/user.entity';
import { Order, OrderStatus } from '../order/entities/order.entity';
import { Payment } from '../payment/entities/payment.entity';

@Injectable()
export class InvoiceService {
    constructor(
        @InjectRepository(Invoice)
        private readonly invoiceRepo: Repository<Invoice>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(Order)
        private readonly orderRepo: Repository<Order>,
        @InjectRepository(Payment)
        private readonly paymentRepo: Repository<Payment>,
    ) {}

    // ============================
    // FIND ALL
    // ============================
    async findAll(): Promise<Invoice[]> {
        return this.invoiceRepo.find({
            relations: ['user', 'order', 'payment'],
            order: { createdAt: 'DESC' },
        });
    }

    // ============================
    // FIND ONE
    // ============================
    async findOne(id: number): Promise<Invoice> {
        const invoice = await this.invoiceRepo.findOne({ 
            where: { id },
            relations: ['user', 'order', 'payment'],
        });
        if (!invoice) throw new NotFoundException(`Invoice with ID ${id} not found`);
        return invoice;
    }

    // ============================
    // CREATE
    // ============================
    async create(dto: CreateInvoiceDto): Promise<Invoice> {
        //  Validar existencia de entidades relacionadas (USER, ORDER, PAYMENT)
        const user = await this.userRepo.findOne({ where: { id: dto.userId } });
        if (!user) throw new NotFoundException('User not found');

        const order = await this.orderRepo.findOne({ 
            where: { id: dto.orderId, user: { id: dto.userId } } 
        });
        if (!order) throw new NotFoundException('Order not found or does not belong to the user');

        // Buscar y validar pago
        const payment = await this.paymentRepo.findOne({ where: { id: dto.paymentId } });
        if (!payment) throw new NotFoundException('Payment not found');
        
        // VALIDACIÓN CRÍTICA DE NEGOCIO: Solo se factura una orden PAGADA
        if (order.status !== OrderStatus.PAID) {
            throw new BadRequestException('Cannot issue invoice: Order is not marked as PAID.');
        }
        
        // Validación: El total de la factura debe coincidir con el total de la orden
        const invoiceAmount = parseFloat(dto.totalAmount.toString()); 
        const orderTotal = (order as any).totalAmount ?? (order as any).total;
        const orderAmount = parseFloat(orderTotal.toString());
        console.log(orderAmount, invoiceAmount);

        // Usamos toFixed(2) para forzar la misma precisión antes de la comparación estricta.
        if (invoiceAmount.toFixed(2) !== orderAmount.toFixed(2)) {
            throw new BadRequestException('Total amount on invoice must match the order total.');
        }

        //  Validar que no haya otra factura con el mismo número
        const existingInvoice = await this.invoiceRepo.findOne({ where: { invoiceNumber: dto.invoiceNumber } });
        if (existingInvoice) {
            throw new BadRequestException(`Invoice number ${dto.invoiceNumber} already exists.`);
        }

        // Crear y guardar la factura
        const invoice = this.invoiceRepo.create({
            user,
            order,
            payment,
            totalAmount: dto.totalAmount,
            invoiceNumber: dto.invoiceNumber,
            status: InvoiceStatus.ISSUED, 
        });

        return this.invoiceRepo.save(invoice);
    }

    // ============================
    // UPDATE
    // ============================
    async update(id: number, dto: UpdateInvoiceDto): Promise<Invoice> {
        const invoice = await this.findOne(id);
        
        // No se debe actualizar una factura cancelada
        if (invoice.status !== InvoiceStatus.ISSUED) {
            throw new BadRequestException('Cannot update a non-issued invoice.');
        }

        Object.assign(invoice, dto);
        return this.invoiceRepo.save(invoice);
    }

    // ============================
    // CANCEL
    // ============================
    async cancel(id: number): Promise<Invoice> {
        const invoice = await this.findOne(id);
        
        if (invoice.status === InvoiceStatus.CANCELLED) {
            throw new BadRequestException('Invoice is already cancelled.');
        }

        invoice.status = InvoiceStatus.CANCELLED;
        invoice.cancellationDate = new Date();
        return this.invoiceRepo.save(invoice);
    }

    // ============================
    // DELETE
    // ============================
    async remove(id: number): Promise<{ message: string }> {
        const invoice = await this.findOne(id);
        
        // Una factura emitida no debe ser eliminada, solo cancelada/anulada.
        if (invoice.status === InvoiceStatus.ISSUED) {
            throw new BadRequestException('Cannot delete an issued invoice. Please cancel it first.');
        }
        
        await this.invoiceRepo.remove(invoice);
        return { message: `Invoice ${id} deleted successfully` };
    }
}