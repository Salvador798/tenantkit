import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../../database/database.tokens.js';
import { REDIS_CLIENT } from '../../../shared/redis/redis.tokens.js';

type ServiceStatus = 'up' | 'down';

interface ReadinessResponse {
  status: 'ok' | 'error';
  services: {
    postgres: ServiceStatus;
    redis: ServiceStatus;
  };
}

@Controller('health')
export class HealthController {
  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get()
  getHealth(): { status: 'ok'; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async getReadiness(): Promise<ReadinessResponse> {
    const [postgres, redis] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
    ]);

    const services = { postgres, redis };

    if (postgres === 'down' || redis === 'down') {
      throw new ServiceUnavailableException({
        status: 'error',
        services,
      } satisfies ReadinessResponse);
    }

    return {
      status: 'ok',
      services,
    };
  }

  private async checkPostgres(): Promise<ServiceStatus> {
    try {
      await this.pool.query('SELECT 1');
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<ServiceStatus> {
    try {
      const response = await this.redis.ping();
      return response === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }
}
