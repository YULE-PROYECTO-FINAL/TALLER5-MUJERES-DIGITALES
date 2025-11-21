/**
 * Controlador encargado de gestionar funciones avanzadas relacionadas con productos externos.
 *
 * Este módulo incluye:
 * - Importación de productos desde DummyJSON (solo ADMIN)
 * - Búsqueda de productos tech externos
 * - Obtención de productos tecnológicos sin filtros
 *
 * Todas las rutas están protegidas mediante autenticación JWT y guardias de rol,
 * excepto aquellas que se desean públicas explícitamente.
 */

import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';

import {
    ApiTags,
    ApiOperation,
    ApiBody,
    ApiQuery,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';

import { ProductService } from './product.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductController {
    constructor(private readonly productService: ProductService) { }

    // ============================================================
    // IMPORTAR PRODUCTOS TECH DESDE DUMMYJSON (ADMIN)
    // ============================================================

    /**
     * Importa productos tecnológicos desde el API externo DummyJSON
     * y los almacena en la base de datos interna.
     *
     * Solo los administradores tienen acceso a este endpoint.
     */
    @Post('import/tech')
    @Roles(UserRole.ADMIN)
    @ApiOperation({
        summary: 'Importar productos tecnológicos desde DummyJSON (solo ADMIN)',
        description:
            'Esta operación trae productos desde DummyJSON y los guarda en tu base de datos. Útil para inicializar o actualizar catálogos tech externos.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                categoryIds: {
                    type: 'array',
                    items: { type: 'number' },
                    example: [1, 3, 5],
                    description: 'Opcional: IDs de categorías donde clasificar los productos importados.',
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Productos importados exitosamente.',
        content: {
            'application/json': {
                example: {
                    message: 'Importación completa.',
                    imported: 15,
                    categoriesApplied: [1, 3, 5],
                },
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: 'Solo administradores pueden realizar esta acción.',
    })
    async importTechProducts(@Body() body: { categoryIds?: number[] }) {
        return await this.productService.importTechProductsFromDummyJSON(
            body.categoryIds,
        );
    }

    // ============================================================
    // BUSCAR PRODUCTOS TECH EXTERNOS
    // ============================================================

    /**
     * Realiza una búsqueda de productos tecnológicos dentro del API externo DummyJSON.
     *
     * No requiere permisos especiales más allá de la autenticación.
     */
    @Get('external/search')
    @ApiOperation({
        summary: 'Buscar productos tecnológicos en DummyJSON',
        description:
            'Permite realizar una búsqueda por texto dentro del catálogo tech externo.',
    })
    @ApiQuery({
        name: 'q',
        required: true,
        example: 'laptop',
        description: 'Término a buscar dentro de los productos externos.',
    })
    @ApiResponse({
        status: 200,
        description: 'Resultados de la búsqueda obtenidos correctamente.',
        content: {
            'application/json': {
                example: {
                    query: 'laptop',
                    results: [
                        { id: 101, title: 'Gaming Laptop', price: 2500 },
                        { id: 102, title: 'Ultra Slim Laptop', price: 1900 },
                    ],
                },
            },
        },
    })
    async searchExternalProducts(@Query('q') query: string) {
        if (!query) return { message: 'Query parameter "q" is required' };

        return await this.productService.searchExternalTechProducts(query);
    }

    // ============================================================
    // OBTENER PRODUCTOS TECH EXTERNOS SIN FILTRO
    // ============================================================

    /**
     * Retorna una lista completa de productos tech disponibles en el API externo DummyJSON.
     *
     * Útil para mostrar catálogos iniciales o cargar vistas públicas.
     */
    @Get('external/tech')
    @ApiOperation({
        summary: 'Obtener todos los productos tech desde DummyJSON',
        description:
            'Devuelve una lista sin filtros de los productos tecnológicos disponibles externamente.',
    })
    @ApiResponse({
        status: 200,
        description: 'Productos obtenidos exitosamente.',
        content: {
            'application/json': {
                example: {
                    count: 10,
                    products: [
                        { id: 501, title: 'Mechanical Keyboard', price: 120 },
                        { id: 502, title: 'Smart Monitor', price: 320 },
                    ],
                },
            },
        },
    })
    async getExternalTechProducts() {
        return await this.productService.getExternalTechProducts();
    }
}