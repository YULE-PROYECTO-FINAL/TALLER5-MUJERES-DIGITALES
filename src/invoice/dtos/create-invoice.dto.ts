import { IsNumber, IsString, IsPositive, IsNotEmpty, Length } from 'class-validator';

export class CreateInvoiceDto {
    @IsNotEmpty()
    @IsNumber()
    @IsPositive()
    userId: number;

    @IsNotEmpty()
    @IsNumber()
    @IsPositive()
    orderId: number;

    @IsNotEmpty()
    @IsNumber()
    @IsPositive()
    paymentId: number;

    // totalAmount debe ser positivo
    @IsNotEmpty()
    @IsNumber()
    @IsPositive()
    totalAmount: number;

    @IsNotEmpty()
    @IsString()
    // Asegura que el número de factura no esté vacío y tenga una longitud razonable
    @Length(5, 50) 
    invoiceNumber: string;
}