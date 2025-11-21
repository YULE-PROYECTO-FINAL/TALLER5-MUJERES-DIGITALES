// chat.service.ts - VERSIÓN SIMPLIFICADA PARA PROBAR
import { Injectable } from '@nestjs/common';
import { ProductService } from '../product/product.service';
import { OrderService } from '../order/order.service';
import {PaymentMethodService} from '../pay-methods/pay-method.service';


@Injectable()
export class ChatService {
    constructor(
        private productService: ProductService,
        private orderService: OrderService,
        private paymentMethodService: PaymentMethodService,
    ) {}

    //CONSULTAR DISPONIBILIDAD DE PRODUCTO //
    async checkProductAvailability(productQuery: string, customerId: string) {
        console.log(`🔍 Buscando producto: ${productQuery}`);
        
        const product = await this.productService.findByQuery(productQuery);
        
        if (!product) {
            return {
                available: false,
                message: `No encontré el producto "${productQuery}"`
            };
        }

        const stockInfo = await this.productService.getStockInfo(product.id);
        const recommendations = await this.productService.getRecommendations(product.id, customerId);

        return {
            available: stockInfo.available,
            product: {
                id: product.id,
                name: product.name,
                price: Number(product.price),
                imageUrl: product.imageUrl,
                description: product.description
            },
            stock: stockInfo,
            message: stockInfo.available 
                ? `✅ ${product.name} está disponible. Stock: ${stockInfo.quantity} unidades. Precio: $${product.price}`
                : `❌ ${product.name} está agotado. Stock actual: ${stockInfo.quantity} unidades.`,
            recommendations: recommendations.slice(0, 3)
        };
    }

    // COMPARAR PRODUCTOS //
    async compareProducts(productQueries: string[]) {
        console.log(`⚖️ Comparando productos: ${productQueries.join(', ')}`);
        
        // Buscar productos
        const productPromises = productQueries.map(query => 
            this.productService.findByQuery(query)
        );
        const products = await Promise.all(productPromises);
        
        const validProducts = products.filter(p => p !== null);
        const validProductIds = validProducts.map(p => p.id);
        
        if (validProducts.length < 2) {
            return {
                success: false,
                message: 'Necesito al menos 2 productos válidos para comparar'
            };
        }

        const comparison = await this.productService.compareProducts(validProductIds);

        return {
            success: true,
            products: comparison,
            message: `He comparado ${validProducts.length} productos:`
        };
    }

    //OBTENER INFORMACIÓN DE GARANTÍA //
    async getWarrantyInfo(productQuery: string) {
        console.log(`🛡️ Consultando garantía para: ${productQuery}`);
        
        const product = await this.productService.findByQuery(productQuery);
        
        if (!product) {
            return {
                found: false,
                message: `No encontré el producto "${productQuery}"`
            };
        }

        const warranty = await this.productService.getWarrantyInfo(product.id);

        return {
            found: true,
            product: product.name,
            warranty: warranty,
            message: `Garantía de ${product.name}: ${warranty.duration} - ${warranty.type}`
        };
    }

    // OBTENER MÉTODOS DE PAGO DISPONIBLES //
    async getPaymentMethodsInfo(): Promise<{
        methods: any[];
        securityInfo?: any;
        message: string;
        tips?: string[];
    }> { 
        try {
            console.log('🔧 Llamando a getAvailablePaymentMethods...');
            const methods = await this.paymentMethodService.getAvailablePaymentMethods();
        
            return {
                methods: methods,
                securityInfo: {
                    encrypted: true,
                    fraudProtection: true,
                    moneyBackGuarantee: true,
                    sslCertified: true
                },
                message: `💳 Tenemos ${methods.length} métodos de pago disponibles para ti:`,
                tips: [
                    '💡 Todas las transacciones están protegidas con encriptación SSL',
                    '🛡️ Protección contra fraudes incluida', 
                    '↩️ Garantía de devolución de 30 días',
                    '📞 Soporte 24/7 para problemas de pago'
                ]
            };
        } catch (error) {
            console.error('Error obteniendo métodos de pago:', error);
            // Datos de respaldo CON securityInfo incluido
            return {
                methods: [
                    {
                        method: 'credit_card',
                        name: 'Tarjeta de Crédito',
                        description: 'Pago seguro con tarjeta de crédito',
                        supportedCards: ['Visa', 'MasterCard', 'American Express'],
                        installments: 'Hasta 12 cuotas sin interés',
                        processingTime: 'Instantáneo'
                    },
                    {
                        method: 'debit_card',
                        name: 'Tarjeta de Débito', 
                        description: 'Pago directo desde tu cuenta',
                        supportedCards: ['Visa', 'MasterCard'],
                        installments: 'Pago único',
                        processingTime: 'Instantáneo'
                    },
                    {
                        method: 'paypal',
                        name: 'PayPal',
                        description: 'Pago rápido y seguro con PayPal',
                        processingTime: 'Instantáneo'
                    },
                    {
                        method: 'bank_transfer',
                        name: 'Transferencia Bancaria',
                        description: 'Transferencia desde tu banco',
                        processingTime: '1-2 días hábiles'
                    }
                ],
                securityInfo: { // 👈 Incluir securityInfo aquí también
                    encrypted: true,
                    fraudProtection: true, 
                    moneyBackGuarantee: true,
                    sslCertified: true
                },
                message: '💳 Métodos de pago disponibles:',
                tips: [
                    'Todas las transacciones están protegidas',
                    'Garantía de devolución de 30 días'
                ]
            };
        }
    }

    //categoria favorita//

    private calculateFavoriteCategory(orders: any[]): string {
        if (!orders || orders.length === 0) return 'Sin compras';
        
        const categoryCount = {};
        orders.forEach(order => {
            order.details?.forEach(detail => {
                if (detail.product?.categories) {
                    detail.product.categories.forEach(category => {
                        categoryCount[category.name] = (categoryCount[category.name] || 0) + 1;
                    });
                }
            });
        });

        const categories = Object.keys(categoryCount);
        if (categories.length === 0) return 'Sin categoría';

        return categories.reduce((a, b) => 
            categoryCount[a] > categoryCount[b] ? a : b
        );
    }

        // OBTENER HISTORIAL DE PEDIDOS DEL CLIENTE //
    async getCustomerOrderHistory(customerId: string) {
        try {
            // Necesitas implementar este método en OrderService
            const orders = await this.orderService.getUserOrderHistory(Number(customerId));
            
            return {
                totalOrders: orders.length,
                totalSpent: orders.reduce((sum, order) => sum + Number(order.total), 0),
                recentOrders: orders.slice(0, 5).map(order => ({
                    id: order.id,
                    date: order.createdAt,
                    total: order.total,
                    status: order.status,
                    items: order.details?.length || 0
                })),
                favoriteCategory: this.calculateFavoriteCategory(orders),
                message: `Tienes ${orders.length} pedidos en tu historial`
            };
        } catch (error) {
            return {
                totalOrders: 0,
                totalSpent: 0,
                recentOrders: [],
                favoriteCategory: 'Sin compras',
                message: 'Aún no tienes pedidos en tu historial'
            };
        }
    }
}