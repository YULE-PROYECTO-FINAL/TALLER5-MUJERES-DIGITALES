import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeService } from './stripe.service';

@Module({
    imports: [ConfigModule],
    providers: [StripeService],
    exports: [StripeService], // Exportar para usar en otros módulos
})
export class StripeModule {}