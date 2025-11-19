import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn, OneToMany} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { CartItem } from './cart-item.entity';
import { Order } from '../../order/entities/order.entity';

@Entity('carts')
export class Cart {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, (user) => user.carts, { onDelete: 'CASCADE' })
    user: User;

    @OneToMany(() => CartItem, cartItem => cartItem.cart)
    items: CartItem[];

    @Column({ default: false })
    checkedOut: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => Order, (order) => order.cart)
    orders: Order[];
}
