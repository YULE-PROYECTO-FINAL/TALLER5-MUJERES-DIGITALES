import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
} from 'typeorm';
import { Order } from '../../order/entities/order.entity';
import { User } from '../../user/entities/user.entity';

export enum PaymentStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    PAID = 'PAID',
    FAILED = 'FAILED',
    REFUNDED = 'REFUNDED',
    CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
    STRIPE = 'STRIPE',
    PAYPAL = 'PAYPAL',
    CREDIT_CARD = 'CREDIT_CARD',
    CASH = 'CASH',
    TRANSFER = 'TRANSFER',
}

@Entity('payments')
export class Payment {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Order, { onDelete: 'CASCADE', eager: true })
    @JoinColumn({ name: 'orderId' })
    order: Order;

    @Column()
    orderId: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    userId: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @Column({
        type: 'enum',
        enum: PaymentMethod,
        default: PaymentMethod.STRIPE,
    })
    method: PaymentMethod;

    @Column({
        type: 'enum',
        enum: PaymentStatus,
        default: PaymentStatus.PENDING,
    })
    status: PaymentStatus;

    @Column({ nullable: true })
    transactionId?: string;

    // 🔥 Nuevo: ID de sesión de Stripe
    @Column({ nullable: true })
    stripeSessionId?: string;

    // 🔥 Nuevo: ID de PaymentIntent de Stripe
    @Column({ nullable: true })
    stripePaymentIntentId?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
