import {
    Controller,
    Post,
    Get,
    Patch,
    Delete,
    Param,
    Body,
    ParseIntPipe,
    UseGuards,
    Req,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { AddCartItemDto } from './dtos/add-cart-item.dto'; // 👈 Usar el nuevo DTO

@Controller('carts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CartController {
    constructor(private readonly cartService: CartService) {}

    // ============================
    // 1. OBTENER CARRITO (CLIENT): GET /carts/my
    // ============================
    @Get('my')
    getCart(@Req() req: any) {
        const userId = Number(req.user.userId);
        return this.cartService.findOrCreateCart(userId); 
    }

    // ============================
    // 2. AÑADIR/ACTUALIZAR ITEM (CLIENT): POST /carts/item
    // Cliente define la QUANTITY
    // ============================
    @Post('item')
    addItem(@Req() req: any, @Body() dto: AddCartItemDto) {
        const userId = Number(req.user.userId);
        return this.cartService.addOrUpdateProduct(userId, dto.productId, dto.quantity);
    }
    
    // ============================
    // 3. ELIMINAR ITEM (CLIENT): DELETE /carts/item/:productId
    // ============================
    @Delete('item/:productId')
    removeItem(@Req() req: any, @Param('productId', ParseIntPipe) productId: number) {
        const userId = Number(req.user.userId);
        return this.cartService.removeProduct(userId, productId);
    }

    // ============================
    // 4. CHECKOUT (CLIENT): PATCH /carts/checkout
    // ============================
    @Patch('checkout')
    async checkout(@Req() req: any) {
        const userId = Number(req.user.userId);
        const cart = await this.cartService.findOrCreateCart(userId);
        return this.cartService.checkout(cart.id); 
    }
    
    // ============================
    // 5. FIND ALL (ADMIN): GET /carts
    // ============================
    @Roles(UserRole.ADMIN)
    @Get()
    findAll() {
        return this.cartService.findAll();
    }
    
    // ============================
    // 5. FIND ONE (ADMIN): GET /carts/:id
    // ============================
    // Opcional: Obtener un carrito por ID (solo ADMIN)
    @Roles(UserRole.ADMIN)
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.cartService.findOne(id);
    }
}