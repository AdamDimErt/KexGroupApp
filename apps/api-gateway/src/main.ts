import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS:
  //   - prod: read CORS_ALLOWED_ORIGINS (comma-separated) or default to ['https://api.kexgroup.kz']
  //   - dev: localhost + LAN
  const prodOriginsEnv = process.env.CORS_ALLOWED_ORIGINS;
  const prodOrigins = prodOriginsEnv
    ? prodOriginsEnv.split(',').map((s) => s.trim()).filter(Boolean)
    : ['https://api.kexgroup.kz'];
  const allowedOrigins =
    process.env.NODE_ENV === 'production'
      ? prodOrigins
      : [/^http:\/\/localhost:\d+$/, /^http:\/\/192\.168\.\d+\.\d+:\d+$/];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('KEX Group API')
    .setDescription('API Gateway — KEX Group Dashboard')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`API Gateway запущен на порту ${port}`);
  console.log(`Swagger: http://localhost:${port}/api/docs`);
}

void bootstrap();
