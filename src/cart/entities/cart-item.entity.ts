import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Product } from '../../product/entities/product.entity';
import { Cart } from './cart.entity';

@Entity('cart_items')
export class CartItem {

    @PrimaryGeneratedColumn()
    id: number;
    
    @Column({ type: 'int', default: 1 }) 
    quantity: number; 

    @ManyToOne(() => Cart, cart => cart.items, { onDelete: 'CASCADE' })
    cart: Cart;

    @ManyToOne(() => Product, { eager: true }) 
    product: Product;

}