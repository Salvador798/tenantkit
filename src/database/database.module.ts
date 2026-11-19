import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { EnvConfig } from '../shared/config/env.schema.js';
import { DATABASE_POOL, DRIZZLE_DB } from './database.tokens.js';
import * as schema from './schema/index.js';

export type DrizzleDatabase = NodePgDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvConfig, true>): Pool => {
        const connectionString = configService.get('DATABASE_URL', {
          infer: true,
        });
        return new Pool({ connectionString });
      },
    },
    {
      provide: DRIZZLE_DB,
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool): DrizzleDatabase => {
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DATABASE_POOL, DRIZZLE_DB],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
