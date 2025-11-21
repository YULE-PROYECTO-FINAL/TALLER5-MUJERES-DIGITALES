import { 
  WebSocketGateway, 
  WebSocketServer, 
  SubscribeMessage, 
  MessageBody, 
  ConnectedSocket, 
  OnGatewayConnection, 
  OnGatewayDisconnect 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { ChatService } from './chat.service';

interface ChatContext {
  currentStep: string;
  comparisonProducts?: string[];
}

@WebSocketGateway(81, {
  cors: { origin: '*' },
  namespace: '/ecommerce-chat'
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);
  
  @WebSocketServer()
  server: Server;

  private chatContexts = new Map<string, ChatContext>();

  constructor(
    private jwtService: JwtService,
    private chatService: ChatService
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      
      if (token) {
        const payload = await this.jwtService.verifyAsync(token);
        client.data.user = payload;
        this.logger.log(`Usuario ${payload.email} conectado`);
      }

      // Inicializar contexto de chat
      this.chatContexts.set(client.id, {
        currentStep: 'welcome'
      });

      // Mensaje de bienvenida
      client.emit('bot_message', {
        type: 'welcome',
        message: '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte?',
        options: [
          'Consultar disponibilidad de productos',
          'Comparar productos', 
          'Consultar garantías',
          'Consultar Metodos de pago'
        ]
      });

    } catch (error) {
      this.logger.error('Error de conexión:', error);
      // Permitir conexión sin token para pruebas
      this.chatContexts.set(client.id, { currentStep: 'welcome' });
      
      client.emit('bot_message', {
        type: 'welcome',
        message: '¡Hola! Modo prueba activado. ¿En qué puedo ayudarte?',
        options: [
          'Consultar disponibilidad de productos',
          'Comparar productos', 
          'Consultar garantías',
          'Consultar Metodos de pago'
        ]
      });
    }
  }

  handleDisconnect(client: Socket) {
    this.chatContexts.delete(client.id);
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('customer_message')
  async handleCustomerMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { message: string; option?: number }
  ) {
    const context = this.chatContexts.get(client.id);
    if (!context) {
      client.emit('bot_message', {
        type: 'error',
        message: 'Sesión no encontrada. Por favor recarga la página.'
      });
      return;
    }

    const customerId = client.data.user?.sub || 'guest';

    try {
      switch (context.currentStep) {
        case 'welcome':
          await this.handleWelcomeResponse(client, data, context);
          break;
        case 'product_availability':
          await this.handleProductAvailability(client, data.message, customerId, context);
          break;
        
        case 'product_comparison':
          await this.handleProductComparison(client, data.message, context);
          break;
        
        case 'warranty_info':
          await this.handleWarrantyInfo(client, data.message, context);
          break;

        case 'pay_methods':
          await this.handlepayMethos(client, data.message, context);
          break;
        
        default:
          await this.handleGeneralInquiry(client, data.message, customerId, context);
      }
    } catch (error) {
      this.logger.error('Error procesando mensaje:', error);
      client.emit('bot_message', {
        type: 'error',
        message: 'Lo siento, hubo un error procesando tu solicitud.'
      });
    }
  }

  private async handleGeneralInquiry(
    client: Socket, 
    message: string, 
    customerId: string, 
    context: ChatContext
  ) {
    client.emit('bot_message', {
      type: 'general_response',
      message: 'Te recomiendo usar las opciones del menú para obtener información específica sobre productos.',
      options: [
        'Consultar disponibilidad de productos',
        'Comparar productos',
        'Consultar garantías',
        'Consultar Metodos de pago'
      ]
    });
    
    context.currentStep = 'welcome';
  }

  private async handleWelcomeResponse(client: Socket, data: any, context: ChatContext) {
    const option = data.option;
    
    switch (option) {
      case 0: // Consultar disponibilidad
        context.currentStep = 'product_availability';
        client.emit('bot_message', {
          type: 'product_availability_prompt',
          message: '¿Qué producto te interesa consultar? Por favor ingresa el nombre del producto.'
        });
        break;
      
      case 1: // Comparar productos
        context.currentStep = 'product_comparison';
        context.comparisonProducts = [];
        client.emit('bot_message', {
          type: 'product_comparison_prompt',
          message: 'Ingresa el nombre del primer producto que quieres comparar:'
        });
        break;
      
      case 2: // Consultar garantías
        context.currentStep = 'warranty_info';
        client.emit('bot_message', {
          type: 'warranty_prompt',
          message: '¿De qué producto quieres consultar la garantía? Ingresa el nombre:'
        });
        break;
      case 3: //Consultar metodos de pago
        context.currentStep = 'pay_methods';
        const paymentMethodsInfo = await this.chatService.getPaymentMethodsInfo();
    
        client.emit('bot_message', {
          type: 'payment_methods',
          message: paymentMethodsInfo.message,
          methods: paymentMethodsInfo.methods,
          options: [
            'Volver al menú principal',
            'Consultar otra información'
          ]
        });
        break;

      
      default:
        client.emit('bot_message', {
          type: 'options',
          message: 'Por favor selecciona una opción del menú:',
          options: [
            'Consultar disponibilidad de productos',
            'Comparar productos',
            'Consultar garantías',
            'Consultar Metodos de pago'
          ]
        });
    }
  }

  private async handleProductAvailability(
    client: Socket, 
    productQuery: string, 
    customerId: string, 
    context: ChatContext
  ) {
    const result = await this.chatService.checkProductAvailability(productQuery, customerId);
    
    client.emit('bot_message', {
      type: 'product_availability',
      message: result.message,
      product: result.product,
      stock: result.stock,
      recommendations: result.recommendations,
      available: result.available
    });

    // Volver al menú principal
    context.currentStep = 'welcome';
    
    client.emit('bot_message', {
      type: 'options',
      message: '¿En qué más puedo ayudarte?',
      options: [
        'Consultar disponibilidad de productos',
        'Comparar productos',
        'Consultar garantías',
        'Consultar Metodos de pago'
      ]
    });
  }

  private async handleProductComparison(client: Socket, productQuery: string, context: ChatContext) {
    if (!context.comparisonProducts) {
      context.comparisonProducts = [];
    }

    if (context.comparisonProducts.length < 2) {
      context.comparisonProducts.push(productQuery);
      
      if (context.comparisonProducts.length === 1) {
        client.emit('bot_message', {
          type: 'product_comparison_next',
          message: 'Ahora ingresa el segundo producto para comparar:'
        });
        return;
      }
    }

    const result = await this.chatService.compareProducts(context.comparisonProducts);
    
    client.emit('bot_message', {
      type: 'product_comparison',
      message: result.message,
      products: result.products,
      success: result.success
    });

    // Resetear contexto
    context.currentStep = 'welcome';
    context.comparisonProducts = [];
  }

  private async handleWarrantyInfo(client: Socket, productQuery: string, context: ChatContext) {
    const warrantyInfo = await this.chatService.getWarrantyInfo(productQuery);
    
    client.emit('bot_message', {
      type: 'warranty_info',
      message: warrantyInfo.message,
      product: warrantyInfo.product,
      warranty: warrantyInfo.warranty,
      found: warrantyInfo.found
    });

    context.currentStep = 'welcome';
  }

  private async handlepayMethos(client: Socket, message: string, context: ChatContext) {
    try {
        // Obtener información de métodos de pago del servicio
        console.log('🔧 [GATEWAY DEBUG] Iniciando handlepayMethos...');
        const paymentMethodsInfo = await this.chatService.getPaymentMethodsInfo();
        
        client.emit('bot_message', {
            type: 'payment_methods',
            message: paymentMethodsInfo.message,
            methods: paymentMethodsInfo.methods,
            securityInfo: paymentMethodsInfo.securityInfo || {
                encrypted: true,
                fraudProtection: true,
                moneyBackGuarantee: true
            }
        });

        // Volver al menú principal
        context.currentStep = 'welcome';
        
        client.emit('bot_message', {
            type: 'options',
            message: '¿En qué más puedo ayudarte?',
            options: [
                'Consultar disponibilidad de productos',
                'Comparar productos',
                'Consultar garantías',
                'Consultar Métodos de pago'
            ]
        });

    } catch (error) {
        this.logger.error('Error obteniendo métodos de pago:', error);
        client.emit('bot_message', {
            type: 'error',
            message: 'Lo siento, no pude obtener la información de métodos de pago en este momento.'
        });
    }
}

  

}