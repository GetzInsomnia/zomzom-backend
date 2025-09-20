import { config } from 'dotenv';
import { z } from 'zod';

config();

const durationSchema = z.union([z.coerce.number().int().positive(), z.string().min(1)]);

const sameSiteSchema = z
  .string()
  .optional()
  .transform((value) => value?.toLowerCase() ?? 'lax')
  .pipe(z.enum(['lax', 'strict', 'none']));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().min(1).max(65535).default(4000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // ใช้โดย Prisma CLI ตอน migrate เท่านั้น (runtime ไม่จำเป็น)
  SHADOW_DATABASE_URL: z.string().optional(),

  ACCESS_TOKEN_SECRET: z
    .string()
    .min(32, 'ACCESS_TOKEN_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_EXPIRES_IN: durationSchema.default('15m'),
  REFRESH_TOKEN_SECRET: z
    .string()
    .min(32, 'REFRESH_TOKEN_SECRET must be at least 32 characters'),
  REFRESH_TOKEN_EXPIRES_IN: durationSchema.default('7d'),
  REFRESH_COOKIE_HTTP_ONLY: z.coerce.boolean().default(true),
  REFRESH_COOKIE_SECURE: z.coerce.boolean().default(false),
  REFRESH_COOKIE_SAME_SITE: sameSiteSchema,
  REFRESH_COOKIE_PATH: z.string().default('/'),
  REFRESH_COOKIE_DOMAIN: z.string().optional(),
  ADMIN_FALLBACK_USERNAME: z.string().optional(),
  ADMIN_FALLBACK_PASSWORD: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
  UPLOAD_DIR: z.string().default('./public/uploads'),
  WATERMARK_ENABLED: z.coerce.boolean().default(true),
  WATERMARK_TEXT: z.string().default('Zomzom Property'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().int().positive().default(15 * 60), // seconds
  INDEX_DIR: z.string().default('./public/data/index')
});

export const env = envSchema.parse(process.env);
export type AppEnv = typeof env;
