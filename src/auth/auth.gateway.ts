import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import {JwtService} from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({cors: true})
export class AuthGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;

      if (!token){
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      client.data.user = payload;

      console.log(`Usario ${payload.username} conectado`);
    } catch (error){
      console.error('Error de autenticación:', error);
      client.disconnect();
      return;
    }
  }

  handleDisconnect(client: Socket) {
    const userPayload = client.data.user;

    if (userPayload){
      console.log(`Usuario ${userPayload.username} desconectado`);
    } else{
      console.log('Usuario no autenticado desconectado');
    }
  }

}
