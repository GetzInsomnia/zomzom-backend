// src/server.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';

import { env } from './env';
import { prisma } from './prisma/client';
import { errorHandler } from './common/middlewares/errorHandler';
import { registerIdempotencyMiddleware } from './common/idempotency';

// plugins/routes
import jwtPlugin from './auth/jwt';
import { registerAuthRoutes } from './auth/routes';
import { registerPropertyRoutes } from './modules/properties/routes';
import { registerArticleRoutes } from './modules/articles/routes';
import { registerSchedulerRoutes } from './modules/scheduler/routes';
import { registerBackupRoutes } from './modules/backup/routes';
import { registerIndexRoutes } from './modules/index/routes';
import { registerSuggestRoutes } from './modules/suggest/routes';
import { SchedulerService } from './modules/scheduler/service';

async function bootstrap() {
  const app = Fastify({
    logger: true,
    bodyLimit: 1_048_576,
    trustProxy: true
  });

  const allowedOrigins = env.CORS_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:3000');
  }

  await app.register(
    helmet,
    // dev: ปิด CSP เพื่อความสะดวก; prod: เปิด CSP
    { contentSecurityPolicy: env.NODE_ENV === 'production' }
  );

  await app.register(cookie);

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW * 1000,
    hook: 'onRequest'
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      cb(null, allowedOrigins.includes(origin));
    },
    credentials: true
  });

  registerIdempotencyMiddleware(app);

  // global error handler
  app.setErrorHandler(errorHandler);

  // register JWT plugin BEFORE routes
  await app.register(jwtPlugin);

  // liveness
  app.get('/health', async () => ({ ok: true, time: new Date().toISOString() }));

  // readiness (ตี DB จริง)
  app.get('/ready', async (req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true, db: 'up', time: new Date().toISOString() };
    } catch (err) {
      req.log.error({ err }, 'readiness failed');
      reply.code(503);
      return { ok: false, db: 'down' };
    }
  });

  // routes
  await app.register(registerAuthRoutes);
  await app.register(registerPropertyRoutes);
  await app.register(registerArticleRoutes);
  await app.register(registerSchedulerRoutes);
  await app.register(registerBackupRoutes);
  await app.register(registerIndexRoutes);
  await app.register(registerSuggestRoutes);

  // background jobs
  SchedulerService.start(app);

  // graceful DB handling
  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  try {
    // connect DB ก่อนเปิดพอร์ต
    await prisma.$connect();

    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`Server listening on port ${env.PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

bootstrap();
