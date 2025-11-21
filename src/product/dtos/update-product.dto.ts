import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
import { IsOptional, IsArray, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para actualizar un producto existente.
 * Permite modificar cualquiera de los campos del producto.
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {
    @ApiPropertyOptional({
        description: 'IDs de categorías asociadas al producto',
        example: [1, 2, 3],
        type: [Number],
    })
    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    categories?: number[];
}