// src/server.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';

import { env } from './env';
import { errorHandler } from './common/middlewares/errorHandler';

// routes register functions
import { registerAuthRoutes } from './auth/routes';
import { registerPropertyRoutes } from './modules/properties/routes';
import { registerArticleRoutes } from './modules/articles/routes';
import { registerSchedulerRoutes } from './modules/scheduler/routes';
import { registerBackupRoutes } from './modules/backup/routes';
import { registerIndexRoutes } from './modules/index/routes';
import { registerSuggestRoutes } from './modules/suggest/routes';
import { SchedulerService } from './modules/scheduler/service';

// JWT plugin (ต้องมี src/auth/jwt.ts ตามที่ตั้งไว้)
import jwtPlugin from './auth/jwt';

async function bootstrap() {
  const app = Fastify({
    logger: true,
    bodyLimit: 1_048_576, // 1MB
    trustProxy: true
  });

  // ----- Security & infra plugins -----
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cookie);
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW * 1000,
    hook: 'onRequest'
  });

  // CORS: รวมจาก .env + เพิ่ม localhost:3000 ใน non-prod
  const allowedOrigins = env.CORS_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:3000');
  }
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true
  });

  // Global error handler
  app.setErrorHandler(errorHandler);

  // ----- Auth plugin (ต้องมาก่อน routes ที่จะใช้ preHandler: app.authenticate) -----
  await app.register(jwtPlugin);

  // ----- Health check -----
  app.get('/health', async () => ({ ok: true, time: new Date().toISOString() }));

  // ----- App routes -----
  await registerAuthRoutes(app);
  await registerPropertyRoutes(app);
  await registerArticleRoutes(app);
  await registerSchedulerRoutes(app);
  await registerBackupRoutes(app);
  await registerIndexRoutes(app);
  await registerSuggestRoutes(app);

  // Background scheduler
  SchedulerService.start(app);

  // Graceful shutdown (optional)
  const close = async () => {
    try {
      await app.close();
      process.exit(0);
    } catch (e) {
      app.log.error(e);
      process.exit(1);
    }
  };
  process.on('SIGINT', close);
  process.on('SIGTERM', close);

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`Server listening on http://0.0.0.0:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
