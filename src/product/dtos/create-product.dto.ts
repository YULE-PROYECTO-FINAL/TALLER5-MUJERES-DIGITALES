import {
    IsString,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsBoolean,
    IsArray,
    IsInt,
    Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para crear un producto en el sistema.
 */
export class CreateProductDto {
    @ApiProperty({ description: 'Nombre del producto', example: 'Camiseta' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: 'Descripción del producto', example: 'Camiseta 100% algodón' })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ description: 'Precio del producto', example: 25000 })
    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    price: number;

    @ApiProperty({ description: 'Cantidad disponible en inventario', example: 50 })
    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    cantidad: number;

    @ApiPropertyOptional({ description: 'Disponibilidad del producto', example: true })
    @IsOptional()
    @IsBoolean()
    available?: boolean;

    @ApiPropertyOptional({ description: 'URL de la imagen del producto', example: 'https://miapp.com/img/producto1.png' })
    @IsOptional()
    @IsString()
    imageUrl?: string;

    @ApiPropertyOptional({ description: 'IDs de categorías asociadas', example: [1, 2, 3], type: [Number] })
    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    categories?: number[];
}