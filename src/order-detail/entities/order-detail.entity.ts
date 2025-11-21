import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from '../../order/entities/order.entity'; 
import { Product } from '../../product/entities/product.entity'; 

@Entity('order_details')
export class OrderDetail {
    @PrimaryGeneratedColumn()
    id: number;

    // 1. Relación ManyToOne (Lazy o Eager, da igual para el FK)
    @ManyToOne(() => Order, (order) => order.details, { 
        onDelete: 'CASCADE', 
        lazy: true // Usamos lazy por performance.
    })
    // 2. 🔑 CLAVE: Indica a TypeORM qué columna es la clave foránea.
    @JoinColumn({ name: 'orderId' })
    order: Promise<Order>; // Debe ser Promise<Order> si usas lazy: true

    // 3. 🔑 CLAVE: Define la columna en la que TypeORM guardará el ID.
    @Column({ nullable: true }) 
    orderId: number; 

    @ManyToOne(() => Product, (product) => product.orderDetails, { onDelete: 'SET NULL', eager: true })
    product: Product;

    @Column('int')
    quantity: number;

    @Column('decimal', { precision: 10, scale: 2 })
    unitPrice: number;

    @Column('decimal', { precision: 10, scale: 2 })
    subtotal: number;
}