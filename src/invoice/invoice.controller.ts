import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    ParseIntPipe,
    UseGuards,
} from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dtos/create-invoice.dto';
import { UpdateInvoiceDto } from './dtos/update-invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';

@Controller('invoices')
// Aplicamos guards a nivel de controlador. Asumimos que la creación es ADMIN/INTERNAL.
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoiceController {
    constructor(private readonly invoiceService: InvoiceService) {}

    // ------------------------------------
    // GET /invoices (ADMIN)
    // ------------------------------------
    @Roles(UserRole.ADMIN)
    @Get()
    findAll() {
        return this.invoiceService.findAll();
    }

    // ------------------------------------
    // GET /invoices/:id (ADMIN / CLIENTE)
    // Se asume que el cliente puede ver su factura si se añade lógica de verificación en findOne
    // ------------------------------------
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        // NOTA: Para producción, este findOne debe verificar que la factura pertenece al usuario si no es ADMIN.
        return this.invoiceService.findOne(id); 
    }

    // ------------------------------------
    // POST /invoices (ADMIN / INTERNAL)
    // La facturación es un proceso interno que sigue al pago.
    // ------------------------------------
    @Roles(UserRole.ADMIN)
    @Post()
    create(@Body() dto: CreateInvoiceDto) {
        return this.invoiceService.create(dto);
    }

    // ------------------------------------
    // PATCH /invoices/:id (ADMIN)
    // ------------------------------------
    @Roles(UserRole.ADMIN)
    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInvoiceDto) {
        return this.invoiceService.update(id, dto);
    }

    // ------------------------------------
    // PATCH /invoices/:id/cancel (ADMIN)
    // ------------------------------------
    @Roles(UserRole.ADMIN)
    @Patch(':id/cancel')
    cancel(@Param('id', ParseIntPipe) id: number) {
        return this.invoiceService.cancel(id);
    }

    // ------------------------------------
    // DELETE /invoices/:id (ADMIN)
    // ------------------------------------
    @Roles(UserRole.ADMIN)
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.invoiceService.remove(id);
    }
}