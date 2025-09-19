import './types/fastify'; // 👈 บังคับให้โหลด module augmentation ของ Fastify

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { env } from './env';

import jwtPlugin from './auth/jwt';
import { errorHandler } from './common/middlewares/errorHandler';

// routes
import { registerAuthRoutes } from './auth/routes';
import { registerPropertyRoutes } from './modules/properties/routes';
import { registerArticleRoutes } from './modules/articles/routes';
import { registerSchedulerRoutes } from './modules/scheduler/routes';
import { registerBackupRoutes } from './modules/backup/routes';
import { registerIndexRoutes } from './modules/index/routes';
import { registerSuggestRoutes } from './modules/suggest/routes';
import { registerCatalogRoutes } from './modules/catalog/routes';
import { SchedulerService } from './modules/scheduler/service';

async function bootstrap() {
  const app = Fastify({
    logger: true,
    bodyLimit: 1_048_576,
    trustProxy: true
  });

  const allowedOrigins = env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean);
  if (env.NODE_ENV !== 'production') allowedOrigins.push('http://localhost:3000');

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

  app.setErrorHandler(errorHandler);

  // 👉 ต้องลง JWT ก่อน route ที่อ่าน req.user
  await app.register(jwtPlugin);

  // health
  app.get('/health', async () => ({ ok: true, time: new Date().toISOString() }));

  // routes
  await registerAuthRoutes(app);
  await registerPropertyRoutes(app);
  await registerArticleRoutes(app);
  await registerSchedulerRoutes(app);
  await registerBackupRoutes(app);
  await registerIndexRoutes(app);
  await registerSuggestRoutes(app);
  await registerCatalogRoutes(app);

  SchedulerService.start(app);

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`Server listening on port ${env.PORT}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
