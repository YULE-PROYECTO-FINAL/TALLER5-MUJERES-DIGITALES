// src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
      bodyParser: false, // CLAVE: Desactiva el body parser built-in
  });
  
  // Body-parser MANUALMENTE para capturar el rawBody
  app.use(
    bodyParser.json({
        verify: (req: any, res, buf) => {
            // Se captura el rawBody para la ruta del webhook de pagos
            if (req.originalUrl.startsWith('/payments/webhook')) {
                req.rawBody = buf; 
            }
        },
    }),
  );

  // Re-habilitar el parser de urlencoded para el resto de las peticiones REST
  app.use(bodyParser.urlencoded({ extended: true }));
  
  // Pipes Globales
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true, 
    transform: true,
  }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();