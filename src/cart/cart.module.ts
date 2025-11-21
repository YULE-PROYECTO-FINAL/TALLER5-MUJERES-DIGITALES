import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from './entities/cart.entity';
import { Product } from '../product/entities/product.entity';
import { User } from '../user/entities/user.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { CartItem } from './entities/cart-item.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Cart, Product, User, CartItem])],
    controllers: [CartController],
    providers: [CartService],
    exports: [CartService, TypeOrmModule]
})
export class CartModule {}
