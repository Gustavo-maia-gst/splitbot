import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = configService.port;
  await app.listen(port);

  logger.log(`🚀 SplitC Discord Agent running on port ${port}`);
  logger.log(`📡 Environment: ${configService.nodeEnv}`);
  logger.log(`🔐 Discord Public Key configured: ${!!configService.discord.publicKey}`);
}

bootstrap();
