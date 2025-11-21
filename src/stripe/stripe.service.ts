import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';


@Injectable()
export class StripeService {
    private stripe: Stripe;

    constructor(private configService: ConfigService) {
        // Inicializar Stripe con la clave secreta
        this.stripe = new Stripe(
            this.configService.get<string>('STRIPE_SECRET_KEY', 'fallback_value'),
            {
                apiVersion: '2025-10-29.clover',
            },
        );
    }

    /**
     * Crear una sesión de pago (Checkout Session)
     */
    async createCheckoutSession(params: {
        orderId: number;
        amount: number;
        currency: string;
        successUrl: string;
        cancelUrl: string;
        customerEmail?: string;
        metadata?: Record<string, string>;
    }): Promise<Stripe.Checkout.Session> {
        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: params.currency,
                        product_data: {
                            name: `Orden #${params.orderId}`,
                            description: 'Compra en La Hormiga Trabajadora',
                        },
                        unit_amount: Math.round(params.amount * 100), // Stripe usa centavos
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: params.successUrl,
            cancel_url: params.cancelUrl,
            customer_email: params.customerEmail,
            metadata: params.metadata,
        });

        return session;
    }

    /**
     * Verificar el estado de una sesión
     */
    async retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
        return this.stripe.checkout.sessions.retrieve(sessionId);
    }

    /**
     * Crear un PaymentIntent (pago directo)
     */
    async createPaymentIntent(params: {
        amount: number;
        currency: string;
        metadata?: Record<string, string>;
    }): Promise<Stripe.PaymentIntent> {
        return this.stripe.paymentIntents.create({
            amount: Math.round(params.amount * 100),
            currency: params.currency,
            metadata: params.metadata,
        });
    }

    /**
     * Verificar firma del webhook
     */
    constructWebhookEvent(
        payload: Buffer,
        signature: string,
        secret: string,
    ): Stripe.Event {
        return this.stripe.webhooks.constructEvent(payload, signature, secret);
    }

    /**
     * Obtener instancia de Stripe (para uso avanzado)
     */
    getStripeInstance(): Stripe {
        return this.stripe;
    }
}