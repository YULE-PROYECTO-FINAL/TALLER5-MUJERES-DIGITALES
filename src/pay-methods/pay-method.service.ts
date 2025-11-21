import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentMethodService {
    getAvailablePaymentMethods() {
        return [
            {
                method: 'credit_card',
                name: 'Tarjeta de Crédito',
                description: 'Pago seguro con tarjeta de crédito',
                supportedCards: ['Visa', 'MasterCard', 'American Express'],
                installments: 'Hasta 12 cuotas sin interés',
                processingTime: 'Instantáneo',
                limits: {
                    minAmount: 1,
                    maxAmount: 50000
                }
            },
            {
                method: 'debit_card',
                name: 'Tarjeta de Débito',
                description: 'Pago directo desde tu cuenta',
                supportedCards: ['Visa', 'MasterCard'],
                installments: 'Pago único',
                processingTime: 'Instantáneo',
                limits: {
                    minAmount: 1,
                    maxAmount: 20000
                }
            },
            {
                method: 'paypal',
                name: 'PayPal',
                description: 'Pago rápido y seguro con PayPal',
                processingTime: 'Instantáneo',
                limits: {
                    minAmount: 1,
                    maxAmount: 10000
                }
            },
            {
                method: 'bank_transfer',
                name: 'Transferencia Bancaria',
                description: 'Transferencia desde tu banco',
                processingTime: '1-2 días hábiles',
                limits: {
                    minAmount: 10,
                    maxAmount: 100000
                }
            },
            {
                method: 'cash_on_delivery',
                name: 'Pago Contra Entrega',
                description: 'Paga cuando recibas tu producto',
                processingTime: 'Al momento de la entrega',
                limits: {
                    minAmount: 1,
                    maxAmount: 5000
                }
            }
        ];
    }
}