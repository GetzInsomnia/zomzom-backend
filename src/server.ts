import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';

import { env } from './env';
import { errorHandler } from './common/middlewares/errorHandler';

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

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cookie);
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW * 1000,
    hook: 'onRequest'
  });
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) cb(null, true);
      else cb(null, false);
    },
    credentials: true
  });

  // global error handler
  app.setErrorHandler(errorHandler);

  // ✅ register JWT plugin BEFORE routes
  await app.register(jwtPlugin);

  // health
  app.get('/health', async () => ({ ok: true, time: new Date().toISOString() }));

  // ✅ register route plugins (อย่าเรียกเป็นฟังก์ชันเอง)
  await app.register(registerAuthRoutes);
  await app.register(registerPropertyRoutes);
  await app.register(registerArticleRoutes);
  await app.register(registerSchedulerRoutes);
  await app.register(registerBackupRoutes);
  await app.register(registerIndexRoutes);
  await app.register(registerSuggestRoutes);

  SchedulerService.start(app);

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`Server listening on port ${env.PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

bootstrap();
