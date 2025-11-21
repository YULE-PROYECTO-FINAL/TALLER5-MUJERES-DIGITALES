// src/payment/payment.controller.ts

import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    ParseIntPipe,
    UseGuards,
    Patch,
    Delete,
    Query,
    Req,
    Headers,
    HttpStatus,
    BadRequestException,
    Res
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common'; 
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express'; 

import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dtos/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { UpdatePaymentDto } from './dtos/update-payment.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) {} 

    // ============================
    // CREAR SESIÓN DE PAGO CON STRIPE
    // ============================
    @Post('stripe/checkout')
    createStripeCheckout(@Body() dto: CreatePaymentDto, @Req() req) {
        const currentUserId = Number(req.user.userId);
        dto.userId = currentUserId;
        return this.paymentService.createStripeCheckout(dto);
    }

    // ============================
    // VERIFICAR PAGO DESPUÉS DE STRIPE
    // ============================
    @Get('verify')
    verifyPayment(@Query('sessionId') sessionId: string) {
        if (!sessionId) {
            throw new BadRequestException('Session ID is required for verification.');
        }
        // Llama al método que acabas de implementar en el servicio
        return this.paymentService.verifyStripePayment(sessionId);
    }
    
    // ============================
    // CREAR PAGO MANUAL (CASH, TRANSFER)
    // ============================
    @Post('manual')
    createManualPayment(@Body() dto: CreatePaymentDto, @Req() req) {
        const currentUserId = Number(req.user.userId);
        const currentUserRole = req.user.role;

        // Solo admin puede crear pagos manuales
        if (currentUserRole !== 'ADMIN') {
            dto.userId = currentUserId;
        }

        return this.paymentService.createManualPayment(dto);
    }

    // ============================
    // VER TODOS LOS PAGOS (ADMIN)
    // ============================
    @Roles(UserRole.ADMIN)
    @Get()
    findAll() {
        return this.paymentService.findAll();
    }

    // ============================
    // VER UN PAGO
    // ============================
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.paymentService.findOne(id);
    }

    // ============================
    // ACTUALIZAR PAGO (ADMIN)
    // ============================
    @Roles(UserRole.ADMIN)
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdatePaymentDto,
    ) {
        return this.paymentService.update(id, dto);
    }

    // ============================
    // ELIMINAR PAGO (ADMIN)
    // ============================
    @Roles(UserRole.ADMIN)
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.paymentService.remove(id);
    }

    // ============================
    // WEBHOOK DE STRIPE (El Evento)
    // ============================
    @Post('webhook')
    async handleStripeWebhook(
        @Req() req: RawBodyRequest<ExpressRequest>,
        @Headers('stripe-signature') signature: string,
        @Res() res: ExpressResponse // Usamos el alias corregido
    ) {
        try {
            // Llama al servicio. La validación del rawBody ocurre dentro del servicio.
            await this.paymentService.handleStripeWebhook(
                req.rawBody,
                signature,
            );
            // Devolver 200 OK a Stripe
            return res.status(HttpStatus.OK).send({ received: true });
        } catch (error) {
            // Devolver 400 si falla la firma o el procesamiento
            return res.status(HttpStatus.BAD_REQUEST).send({ message: error.message });
        }
    }
}