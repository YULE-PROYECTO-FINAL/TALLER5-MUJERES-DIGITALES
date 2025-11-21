import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentDto } from './create-payment.dto';
import { IsInt, IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {
    @IsInt()
    orderId?: number;
    
    @IsNumber()
    amount?: number; // monto que paga (cliente)
    
   @IsOptional()
    @IsEnum(PaymentMethod, {
        message: `El método de pago debe ser uno de los siguientes valores: ${Object.values(PaymentMethod).join(', ')}`,
    })
    // 🔑 CORRECCIÓN: Usar el tipo PaymentMethod en lugar de string.
    method?: PaymentMethod;
    @IsOptional()
    @IsString()
    transactionId?: string; // id del proveedor (opcional)

    @IsString()
    @IsOptional()
    status?: string;
}
