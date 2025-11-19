import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderDetail } from './entities/order-detail.entity';
import { CreateOrderDetailDto } from './dtos/create-order-detail.dto';
import { UpdateOrderDetailDto } from './dtos/update-order-detail.dto';
import { Order } from '../order/entities/order.entity';
import { Product } from '../product/entities/product.entity';

@Injectable()
export class OrderDetailService {
    constructor(
        @InjectRepository(OrderDetail)
        private readonly detailRepo: Repository<OrderDetail>,

        @InjectRepository(Order)
        private readonly orderRepo: Repository<Order>,

        @InjectRepository(Product)
        private readonly productRepo: Repository<Product>,
    ) {}

    async findAll(): Promise<OrderDetail[]> {
        return this.detailRepo.find({ relations: ['order', 'product'] });
    }

    async findOne(id: number, currentUserId?: number): Promise<OrderDetail> { 
    
        const whereCondition: any = { id };

        if (currentUserId) {
            // Aseguramos que la orden pertenezca al usuario
            whereCondition.order = { user: { id: currentUserId } }; 
        }
        
        // crear la relación 'order' con lazy: true
        const detail = await this.detailRepo.findOne({
            where: whereCondition, 
            relations: ['order', 'product'], 
        });

        if (!detail) {
            throw new NotFoundException(`Order detail ${id} not found`); 
        }

        return detail;
    }

    async create(dto: CreateOrderDetailDto): Promise<OrderDetail> {
    const order = await this.orderRepo.findOne({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const product = await this.productRepo.findOne({
        where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const subtotal = Number(product.price) * dto.quantity; 

    const detail = this.detailRepo.create({
        // Pasamos el objeto Order como referencia ID
        order: { id: order.id } as any, 
        
        // usamos el producto como referencia ID para consistencia
        product: { id: product.id } as any, 
        
        quantity: dto.quantity,
        unitPrice: product.price,
        subtotal,
    });

    return this.detailRepo.save(detail);
}

    async update(id: number, dto: UpdateOrderDetailDto): Promise<OrderDetail> {
        const detail = await this.findOne(id);
        let updatedDetail = detail;

        if (dto.quantity && dto.quantity !== detail.quantity) {
            
            // Recalcular subtotal del detalle
            detail.quantity = dto.quantity;
            // Se asume que unitPrice es de tipo number o string que se puede convertir
            detail.subtotal = Number(detail.unitPrice) * dto.quantity; 

            updatedDetail = await this.detailRepo.save(detail);

            
            // Acceder a la promesa 'order' con await si la relación es lazy.
            const orderReference = await detail.order;
            
            // Cargamos la orden con todos sus detalles para recalcular el total
            const orderWithDetails = await this.orderRepo.findOne({
                where: { id: orderReference.id },
                relations: ['details'], 
            });

            if (orderWithDetails) {
                    const newTotal = orderWithDetails.details.reduce(
                    // Convertir subtotal a Number antes de sumar para evitar concatenación.
                        (acc, d) => acc + Number(d.subtotal),
                        0,
                    );
                    orderWithDetails.total = newTotal;
                    await this.orderRepo.save(orderWithDetails);
            }
        }
        
        return updatedDetail;
    }

    async remove(id: number): Promise<{ message: string }> {
        const detail = await this.findOne(id);
        
        // Acceder a la promesa 'order' con await si la relación es lazy.
        const orderReference = await detail.order;
        const orderId = orderReference.id;
        
        await this.detailRepo.remove(detail);
        
        // Recalcular el total de la orden después de la eliminación
        const orderWithRemainingDetails = await this.orderRepo.findOne({
            where: { id: orderId },
            relations: ['details'],
        });

        if (orderWithRemainingDetails) {
            const newTotal = orderWithRemainingDetails.details.reduce(
                // Convertir subtotal a Number antes de sumar para evitar concatenación.
                (acc, d) => acc + Number(d.subtotal),
                0,
            );
            orderWithRemainingDetails.total = newTotal;
            await this.orderRepo.save(orderWithRemainingDetails);
        }

        return { message: `Order detail ${id} deleted successfully` };
    }
}