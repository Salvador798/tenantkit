import { z } from 'zod';

const LOCAL_DEFAULTS = {
  DATABASE_URL:
    'postgresql://tenantkit_app:tenantkit_app_password@localhost:5432/tenantkit',
  DATABASE_ADMIN_URL:
    'postgresql://tenantkit:tenantkit_password@localhost:5432/tenantkit',
  REDIS_URL: 'redis://localhost:6379',
} as const;

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.url(),
  DATABASE_ADMIN_URL: z.url(),
  REDIS_URL: z.url(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const isProduction = config.NODE_ENV === 'production';

  const resolvedConfig: Record<string, unknown> = isProduction
    ? config
    : {
        ...LOCAL_DEFAULTS,
        ...Object.fromEntries(
          Object.entries(config).filter(
            ([, value]) => value !== undefined && value !== '',
          ),
        ),
      };

  return envSchema.parse(resolvedConfig);
}
