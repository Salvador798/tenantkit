import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { EnvConfig } from '../config/env.schema.js';
import { REDIS_CLIENT } from './redis.tokens.js';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvConfig, true>): Redis => {
        const redisUrl = configService.get('REDIS_URL', { infer: true });
        return new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    if (this.redis.status === 'ready') {
      await this.redis.quit();
      return;
    }

    this.redis.disconnect();
  }
}
