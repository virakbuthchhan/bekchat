import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './modules/websockets/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Configure Redis Socket.IO Adapter for WebSockets
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // Configure Swagger OpenAPI 3.0 Documentation
  const config = new DocumentBuilder()
    .setTitle('Bek-Chat API Reference')
    .setDescription(
      'Self-hostable, real-time team chat platform with Webhooks, Telegram-style Bot API, and WebSockets.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-API-Token', in: 'header' }, 'X-API-Token')
    .addApiKey({ type: 'apiKey', name: 'X-Bot-Token', in: 'header' }, 'X-Bot-Token')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Bek-Chat API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Bek-Chat server listening on http://localhost:${port}`);
  console.log(`📖 Swagger API documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
