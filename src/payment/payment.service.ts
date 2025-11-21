import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderService } from '../order/order.service'; 
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import Stripe from 'stripe'; 

import { CreatePaymentDto } from './dtos/create-payment.dto';
import { UpdatePaymentDto } from './dtos/update-payment.dto';
import { Payment, PaymentMethod, PaymentStatus } from './entities/payment.entity'; // Importamos los enums
import { OrderStatus } from '../order/entities/order.entity'; 

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);
    private readonly stripe: Stripe; 
    private readonly webhookSecret: string; 

    constructor(
        @InjectRepository(Payment)
        private readonly paymentRepository: Repository<Payment>,
        private readonly orderService: OrderService,
        private readonly configService: ConfigService,
    ) {
        this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY')!, {
            apiVersion: '2025-10-29.clover' as any, 
        });
        
        this.webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET')!; 
    }
    
    // ==========================================
    // MÉTODOS DE PAGO REST
    // ==========================================
    async createStripeCheckout(dto: CreatePaymentDto) {
    this.logger.log(`Initiating Stripe checkout for User ${dto.userId}, Order ${dto.orderId}`);
    
    // Obtener la Orden y su Monto Autorizado de la DB
    const order = await this.orderService.findOne(dto.orderId);

    if (!order) {
        throw new NotFoundException(`Order with ID ${dto.orderId} not found.`);
    }
    
    // Verificación de usuario
    if (!order.user || !order.user.email) {
        this.logger.error(`Order ${dto.orderId} is missing the user relationship or email.`);
        throw new BadRequestException('Cannot proceed: Order user data is incomplete. Check OrderService relations.');
    }
    
    // Método de verificación de monto
    if (!order.total || order.total <= 0) {
        this.logger.error(`Order ${dto.orderId} has invalid or zero total: ${order.total}`);
        throw new BadRequestException('Cannot proceed: Order total is invalid or missing.');
    }
    
    // Verificación de propiedad
    if (order.user.id !== dto.userId) {
        throw new BadRequestException('Order does not belong to this user.');
    }

    const finalAmount = order.total;
    // Stripe usa centavos, por lo que multiplicamos por 100
    const amountInCents = Math.round(finalAmount * 100);

        // Registro de Pago en PENDIENTE
        const newPayment = await this.paymentRepository.save({
            orderId: order.id,
            userId: dto.userId,
            amount: finalAmount,
            method: PaymentMethod.STRIPE, 
            status: PaymentStatus.PENDING, 
        });

        try {
            //  Llamar a Stripe para crear la Sesión
            const session = await this.stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'usd', // Moneda correcta
                        product_data: { 
                            name: `Compra en La Hormiga Trabajadora - Orden #${order.id}`, 
                        },
                        unit_amount: amountInCents,
                    },
                    quantity: 1,
                }],
                mode: 'payment',
                // Las URLs de éxito/cancelación deben apuntar a tu frontend
                success_url: `${this.configService.get('FRONTEND_URL')}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${this.configService.get('FRONTEND_URL')}/payment/cancel`,
                
                // Metadata para que el Webhook identifique la orden/pago
                metadata: {
                    orderId: order.id.toString(),
                    paymentId: newPayment.id.toString(), 
                },
                // Para prellenar el correo del cliente
                customer_email: order.user ? order.user.email : undefined, 
            });

            // Actualizar el registro de Pago con el ID de la sesión de Stripe
            await this.paymentRepository.update(newPayment.id, {
                stripeSessionId: session.id,
            });

            // Devolver la URL para que el frontend redirija al usuario
            return { 
                url: session.url,
                sessionId: session.id,
            };

        } catch (error) {
            this.logger.error('Error creating Stripe session:', error.message);
            // Si la llamada a Stripe falla, marcar el registro de pago como CANCELADO
            await this.paymentRepository.update(newPayment.id, { status: PaymentStatus.CANCELLED });
            throw new BadRequestException('Payment gateway error. Please try again.');
        }
    }
    async verifyStripePayment(sessionId: string) {
        this.logger.log(`Starting verification for Stripe session: ${sessionId}`);
        
        // Recuperar sesión de Stripe
        const session = await this.stripe.checkout.sessions.retrieve(sessionId);
        
        // Extraer metadatos cruciales
        const paymentIdString = session.metadata?.paymentId;
        
        if (!paymentIdString) {
            this.logger.error(`Session ${sessionId} missing required metadata (paymentId).`);
            throw new BadRequestException('Payment verification failed due to missing internal ID.');
        }

        const paymentId = parseInt(paymentIdString);
        
        // Obtener el registro de pago local
        const localPayment = await this.paymentRepository.findOneBy({ id: paymentId });

        if (!localPayment) {
            this.logger.error(`Local payment record ${paymentId} not found.`);
            throw new NotFoundException(`Local payment record not found for ID ${paymentId}.`);
        }

        // Determinar y aplicar el nuevo estado
        let newPaymentStatus: PaymentStatus;
        let newOrderStatus: OrderStatus;
        let message: string;

        if (session.payment_status === 'paid' && session.status === 'complete') {
            newPaymentStatus = PaymentStatus.PAID;
            newOrderStatus = OrderStatus.PAID;
            message = 'Payment successfully confirmed.';
            this.logger.log(`🎉 Payment ${paymentId} confirmed via verification API.`);
        } else if (session.payment_status === 'unpaid' && session.status === 'open') {
            // El usuario es redirigido pero no completó el pago (raro si es success_url)
            newPaymentStatus = PaymentStatus.PENDING;
            newOrderStatus = OrderStatus.PENDING;
            message = 'Payment is still pending on Stripe.';
        } else {
            // Falla, cancelación o cualquier otro estado no deseado
            newPaymentStatus = PaymentStatus.FAILED;
            newOrderStatus = OrderStatus.CANCELLED;
            message = 'Payment failed or was cancelled.';
            this.logger.warn(`❌ Payment ${paymentId} failed. Stripe status: ${session.payment_status}`);
        }

        // Actualizar los estados en la base de datos
        if (localPayment.status !== newPaymentStatus) {
            
            // Actualizar el registro de pago
            await this.paymentRepository.update(paymentId, { 
                status: newPaymentStatus,
                stripePaymentIntentId: session.payment_intent as string // Guardamos el PI ID
            });
            
            // Actualizar el estado de la orden (si la orden ID está en el pago local)
            await this.orderService.updateStatus(localPayment.orderId, newOrderStatus);
        }

        // Devolver el resultado al cliente
        return { 
            message: message, 
            status: newPaymentStatus,
            stripeStatus: session.payment_status 
        };
    }

    async createManualPayment(dto: CreatePaymentDto) {
        return this.paymentRepository.save({ 
            ...dto, 
            method: PaymentMethod.CASH, 
            status: PaymentStatus.PAID 
        });
    }

    findAll() {
        return this.paymentRepository.find();
    }

    findOne(id: number) {
        return this.paymentRepository.findOneBy({ id });
    }

    update(id: number, dto: UpdatePaymentDto) {
        return this.paymentRepository.update(id, dto as any);
    }

    remove(id: number) {
        return this.paymentRepository.delete(id);
    }
    
    // ==========================================
    // LÓGICA DEL WEBHOOK Y DESCUENTO DE STOCK
    // ==========================================
    async handleStripeWebhook(rawBody: Buffer | undefined, signature: string): Promise<void> {
        let event: Stripe.Event; 

        if (!rawBody) {
             this.logger.error('Webhook recibido sin body RAW. Revisar main.ts');
             throw new BadRequestException('Webhook received with no body.');
        }

        // Verificar la firma del Webhook
        try {
            event = this.stripe.webhooks.constructEvent(
                rawBody, 
                signature,
                this.webhookSecret,
            );
        } catch (err) {
            this.logger.error(`❌ Fallo la verificación del webhook: ${err.message}`);
            throw new BadRequestException('Webhook signature verification failed.');
        }

        this.logger.log(`✅ Webhook verificado. Tipo: ${event.type}`);

        // Procesar el Evento
        switch (event.type) {
            
            case 'payment_intent.succeeded':
                // Tipar con Stripe.PaymentIntent
                const paymentIntent: Stripe.PaymentIntent = event.data.object as Stripe.PaymentIntent; 
                const orderIdString = paymentIntent.metadata?.orderId;
                
                if (!orderIdString) {
                    this.logger.error('PaymentIntent no tiene orderId en los metadatos.');
                    return; 
                }
                
                const orderId = parseInt(orderIdString);

                await this.orderService.updateStatus(orderId, OrderStatus.PAID); 
                
                this.logger.log(`🎉 Orden ${orderId} CONFIRMADA. Inventario descontado.`);
                break;
            
            case 'payment_intent.payment_failed':
                const failedIntent: Stripe.PaymentIntent = event.data.object as Stripe.PaymentIntent;
                const failedOrderIdString = failedIntent.metadata?.orderId;
                
                if (failedOrderIdString) {
                    const failedOrderId = parseInt(failedOrderIdString);
                    
                    await this.orderService.updateStatus(failedOrderId, OrderStatus.CANCELLED);
                    this.logger.warn(`❌ Orden ${failedOrderId} marcada como FALLIDA.`);
                }
                break;
                
            default:
                this.logger.verbose(`Evento no manejado: ${event.type}`);
        }
    }
}