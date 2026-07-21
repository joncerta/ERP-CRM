import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configuredOrigins = process.env.WEB_ORIGIN?.split(',').map((o) => o.trim()) ?? ['http://localhost:5173'];
  const isProduction = process.env.NODE_ENV === 'production';

  app.enableCors({
    origin(origin, callback) {
      // No Origin header (curl, server-to-server, same-origin) — allow.
      if (!origin) return callback(null, true);
      // In dev, Vite may fall back to a different port if 5173 is taken —
      // allow any localhost/127.0.0.1 origin instead of hardcoding one port.
      const isLocalDev = !isProduction && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
      const isAllowed = configuredOrigins.includes(origin) || isLocalDev;
      callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
    },
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
