import 'dotenv/config';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ConsoleLogger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      logger: new ConsoleLogger({
        prefix: 'bff',
        compact: true,
      }),
    },
  );
  const fastifyInstance = app.getHttpAdapter().getInstance();
  const alreadyRegistered =
    typeof fastifyInstance.hasRequestDecorator === 'function'
      ? fastifyInstance.hasRequestDecorator('corsPreflightEnabled')
      : false;

  if (!alreadyRegistered) {
    await fastifyInstance.register(cors, {
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });
  }

  await fastifyInstance.register(cookie);
  await app.register(websocket);
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
void bootstrap();
