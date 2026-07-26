import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validateDatabaseEnv } from './database.config';

async function bootstrap() {
  try {
    validateDatabaseEnv();

    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });
    app.setGlobalPrefix('api');
    app.enableCors();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    const port = Number(process.env.PORT ?? 3000);
    await app.listen(port, '0.0.0.0');
    console.log(`daily-recipe-api listening on 0.0.0.0:${port}`);
  } catch (error) {
    console.error('Failed to start daily-recipe-api:', error);
    process.exit(1);
  }
}
bootstrap();
