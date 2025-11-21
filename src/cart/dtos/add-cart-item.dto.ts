import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class AddCartItemDto {
    @IsNotEmpty()
    @IsInt()
    productId: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1, { message: 'Quantity must be at least 1' })
    quantity: number;
}