import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    Req,
    ParseIntPipe,
    UseGuards,
} from '@nestjs/common';
import { OrderDetailService } from './order-detail.service';
import { CreateOrderDetailDto } from './dtos/create-order-detail.dto';
import { UpdateOrderDetailDto } from './dtos/update-order-detail.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';

@Controller('order-details')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderDetailController {
    constructor(private readonly service: OrderDetailService) {}

    // ============================
    // FIND ALL (SOLO ADMIN)
    // ============================
    @Roles(UserRole.ADMIN)
    @Get()
    findAll() {
        return this.service.findAll();
    }

    // ============================
    // FIND ONE (Permitido, aunque normalmente se accede a través del pedido)
    // ============================
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) { 
        const currentUserRole = req.user.role;
        const currentUserId = Number(req.user.userId);
        
        // Si no es ADMIN, pasa el ID del usuario para forzar el filtro de propiedad.
        if (currentUserRole !== UserRole.ADMIN) {
            return this.service.findOne(id, currentUserId);
        }
        
        // Si es ADMIN, permite buscar cualquier ID sin filtro.
        return this.service.findOne(id);
    }

    // ============================
    // CREATE (SOLO ADMIN / Lógica interna)
    // ============================
    @Roles(UserRole.ADMIN)
    @Post()
    create(@Body() dto: CreateOrderDetailDto) {
        return this.service.create(dto);
    }

    // ============================
    // UPDATE (SOLO ADMIN)
    // ============================
    @Roles(UserRole.ADMIN)
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateOrderDetailDto,
    ) {
        return this.service.update(id, dto);
    }

    // ============================
    // DELETE (SOLO ADMIN)
    // ============================
    @Roles(UserRole.ADMIN)
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.service.remove(id);
    }
}