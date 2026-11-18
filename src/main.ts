import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // CORS_ORIGIN aceita uma lista separada por vírgula (ex.: domínio do front em produção).
  app.enableCors({
    origin:
      process.env.CORS_ORIGIN?.split(',').map(origin => origin.trim()) ??
      'http://localhost:4200',
  });
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
