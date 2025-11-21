import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToMany,
    JoinTable,
    OneToMany,
} from 'typeorm';
import { Category } from '../../category/entities/category.entity';
import { OrderDetail } from '../../order-detail/entities/order-detail.entity';

@Entity('products')
export class Product {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ type: 'text' })
    description: string;

    @Column('decimal', { precision: 10, scale: 2 })
    price: number;

    @Column({ type: 'integer', default: 0 })
    cantidad: number;

    @Column({ default: true })
    available: boolean;

    @Column({ nullable: true })
    imageUrl: string;

    // Relación con categorías
    @ManyToMany(() => Category, (category) => category.products)
    @JoinTable({
    name: 'product_category',
    joinColumn: { name: 'product_id' },
    inverseJoinColumn: { name: 'category_id' },
    })
    categories: Category[];

    // Relación con los detalles de pedido
    @OneToMany(() => OrderDetail, (detail) => detail.product)
    orderDetails: OrderDetail[];
}
