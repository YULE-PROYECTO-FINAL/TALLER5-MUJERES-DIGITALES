// payment-method/payment-method.module.ts
import { Module } from '@nestjs/common';
import { PaymentMethodService } from './pay-method.service';

@Module({
    providers: [PaymentMethodService],
    exports: [PaymentMethodService],
})
export class PaymentMethodModule {}