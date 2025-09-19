// src/server.ts
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

// 👉 เพิ่มปลั๊กอิน JWT
import jwtPlugin from './auth/jwt';

async function bootstrap() {
  const app = Fastify({
    logger: true,
    bodyLimit: 1_048_576,
    trustProxy: true
  });

  const allowedOrigins = env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
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

  // error handler กลาง
  app.setErrorHandler(errorHandler);

  // 👉 ลงปลั๊กอิน JWT “ตรงนี้”
  await app.register(jwtPlugin);

  // health (กันพลาด)
  app.get('/health', async () => ({ ok: true, time: new Date().toISOString() }));

  // routes ต่าง ๆ
  await registerAuthRoutes(app);
  await registerPropertyRoutes(app);
  await registerArticleRoutes(app);
  await registerSchedulerRoutes(app);
  await registerBackupRoutes(app);
  await registerIndexRoutes(app);
  await registerSuggestRoutes(app);

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
