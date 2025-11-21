// src/payment/payment.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Payment } from './entities/payment.entity';
import { OrderModule } from '../order/order.module'; // Proporciona el OrderService

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    ConfigModule,
    OrderModule, 
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}