import { IsInt, IsNumber, IsString, IsOptional, Min, IsEnum, IsNotEmpty } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
    // El único campo obligatorio en el cuerpo de la solicitud (body) es el OrderId
    @IsNotEmpty()
    @IsNumber()
    orderId: number; 

    // CLAVE: El userId se INYECTA desde el JWT en el controlador. No debe ser obligatorio en el body.
    @IsOptional()
    @IsNumber()
    userId?: number; 
    
    // CLAVE: El amount DEBERÍA ser calculado por el backend (lo corregiremos después), 
    // pero por ahora lo hacemos opcional para que la validación pase si no lo envías.
    @IsOptional()
    @IsNumber()
    @Min(0.01)
    amount?: number; 

    // CLAVE: El method se fija a 'STRIPE' en el controlador o servicio.
  @IsOptional()
    @IsEnum(PaymentMethod)
    method?: PaymentMethod;
  }