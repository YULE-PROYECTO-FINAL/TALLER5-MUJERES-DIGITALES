import { Entity, PrimaryGeneratedColumn, ManyToOne, OneToMany, Column } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { OrderDetail } from '../../order-detail/entities/order-detail.entity';
import { Cart } from '../../cart/entities/cart.entity';


export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'SET NULL', eager: true })
  user: User;

  // relación opcional con el carrito (referencia)
  @ManyToOne(() => Cart, (cart) => cart.orders, { onDelete: 'SET NULL', nullable: true, eager: true })
  cart?: Cart;

  // detalles de la orden
  @OneToMany(() => OrderDetail, (detail) => detail.order, { cascade: true, eager: true })
  details: OrderDetail[];

  // total en decimal; guardamos en DB como decimal, pero al exponer lo convertimos a number
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
