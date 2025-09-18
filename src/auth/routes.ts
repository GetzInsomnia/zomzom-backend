import { FastifyInstance } from 'fastify';
import { authenticate } from '../common/middlewares/authGuard';
import { clearCsrfCookie, issueCsrfToken } from '../common/middlewares/csrf';
import { loginSchema } from './schemas';
import { AuthService } from './service';

export async function registerAuthRoutes(app: FastifyInstance) {
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

  app.get('/v1/auth/me', { preHandler: [authenticate] }, async (request) => {
    const user = await AuthService.getProfile(request.user!.id);
    return user;
  });

  app.post('/v1/auth/logout', { preHandler: [authenticate] }, async (_, reply) => {
    clearCsrfCookie(reply);
    return { message: 'Logged out' };
  });
}
