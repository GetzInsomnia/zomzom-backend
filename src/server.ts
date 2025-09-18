import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';

import { env } from './env';
import { errorHandler } from './common/middlewares/errorHandler';

import { registerAuthRoutes } from './auth/routes';
import { registerPropertyRoutes } from './modules/properties/routes';
import { registerArticleRoutes } from './modules/articles/routes';
import { registerSchedulerRoutes } from './modules/scheduler/routes';
import { registerBackupRoutes } from './modules/backup/routes';
import { registerIndexRoutes } from './modules/index/routes';
import { registerSuggestRoutes } from './modules/suggest/routes';
import { SchedulerService } from './modules/scheduler/service';

export async function createServer() {
  const app = Fastify({
    logger: true,
    bodyLimit: 1_048_576, // 1MB JSON; uploads ใช้ multipart แยก
    trustProxy: true,
  });

  // สร้าง allow-list สำหรับ CORS
  const allowedOrigins = (env.CORS_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (env.NODE_ENV !== 'production' && !allowedOrigins.includes('http://localhost:3000')) {
    allowedOrigins.push('http://localhost:3000');
  }
  app.log.info({ allowedOrigins }, 'CORS allow list');

  // Security & Platform
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cookie);
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW * 1000, // sec -> ms
    hook: 'onRequest',
  });
  await app.register(cors, {
    origin: (origin, cb) => {
      // อนุญาตเครื่องมือทดสอบ/health (ไม่มี Origin)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('CORS origin not allowed'), false);
    },
    credentials: true,
  });

  // Error handler กลาง
  app.setErrorHandler(errorHandler);

  // Healthcheck
  app.get('/health', async () => ({ ok: true }));

  // Routes
  await registerAuthRoutes(app);
  await registerPropertyRoutes(app);
  await registerArticleRoutes(app);
  await registerSchedulerRoutes(app);
  await registerBackupRoutes(app);
  await registerIndexRoutes(app);
  await registerSuggestRoutes(app);

  // Background scheduler (กันล้มตอนเริ่ม)
  try {
    SchedulerService.start(app);
    app.log.info('Scheduler started');
  } catch (err) {
    app.log.error({ err }, 'Scheduler failed to start (continuing)');
  }

  return app;
}

async function bootstrap() {
  const app = await createServer();
  const host = env.HOST || '0.0.0.0';
  const port = env.PORT ?? 4000;

  try {
    await app.listen({ host, port });
    app.log.info(`Server listening on http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    try {
      await app.close();
      process.exit(0);
    } catch (e) {
      app.log.error(e);
      process.exit(1);
    }
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap();
