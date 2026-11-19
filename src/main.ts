import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import type { EnvConfig } from './shared/config/env.schema.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const configService = app.get<ConfigService<EnvConfig, true>>(ConfigService);
  const port = configService.get('PORT', { infer: true });

  await app.listen(port);
}
await bootstrap();
