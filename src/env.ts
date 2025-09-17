import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CORS_ORIGIN: z.string().min(1),
  UPLOAD_DIR: z.string().default('./public/uploads'),
  WATERMARK_ENABLED: z.coerce.boolean().default(true),
  WATERMARK_TEXT: z.string().default('Zomzom Property'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().int().positive().default(15 * 60),
  INDEX_DIR: z.string().default('./public/data/index')
});

export const env = envSchema.parse(process.env);

export type AppEnv = typeof env;
