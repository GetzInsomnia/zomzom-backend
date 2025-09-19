/// <reference path="../global.d.ts" />
import type { FastifyPluginAsync } from 'fastify';
import { authGuard } from '../common/middlewares/authGuard';
import { clearCsrfCookie, issueCsrfToken } from '../common/middlewares/csrf';
import { loginSchema } from './schemas';
import { AuthService } from './service';

export const registerAuthRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/v1/auth/login',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: 15 * 60 * 1000,
          keyGenerator: (request) => request.ip
        }
      }
    },
    async (request, reply) => {
      const body = loginSchema.parse(request.body);
      const result = await AuthService.login(body.username, body.password, request.ip);
      const csrfToken = issueCsrfToken(reply);
      return reply.send({ ...result, csrfToken });
    }
  );

  app.get('/v1/auth/me', { preHandler: [authGuard] }, async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: 'UNAUTHORIZED' });
    return { user: req.user };
  });

  app.post('/v1/auth/logout', { preHandler: [authGuard] }, async (_req, reply) => {
    reply.clearCookie('token', { path: '/' });
    return { ok: true };
  });
};
