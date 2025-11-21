import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Order } from '../../order/entities/order.entity';
import { Payment } from '../../payment/entities/payment.entity';

//  Enum de estados de factura
export enum InvoiceStatus {
    ISSUED = 'ISSUED',      // Emitida
    CANCELLED = 'CANCELLED', // Cancelada
}

@Entity('invoices')
export class Invoice {
    @PrimaryGeneratedColumn()
    id: number;

    // Índice único para asegurar que no haya duplicados
    @Index()
    @Column({ unique: true, length: 50 })
    invoiceNumber: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    totalAmount: number;

    // --- Relaciones ---
    
    // Usuario
    @Column()
    userId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    // Orden
    @Column()
    orderId: number;

    @ManyToOne(() => Order)
    @JoinColumn({ name: 'orderId' })
    order: Order;

    // Pago
    @Column()
    paymentId: number;

    @ManyToOne(() => Payment)
    @JoinColumn({ name: 'paymentId' })
    payment: Payment;

    // Estado de la Factura (usando el Enum)
    @Column({
        type: 'enum',
        enum: InvoiceStatus,
        default: InvoiceStatus.ISSUED,
    })
    status: InvoiceStatus;
    
    // --- Fechas ---
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    cancellationDate: Date;
}