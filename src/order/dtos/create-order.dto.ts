import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
    
    @IsOptional()
    @IsInt()
    userId: number;

    @IsInt()
    cartId: number;

    @IsOptional()
    @IsString()
    status?: string;
}
