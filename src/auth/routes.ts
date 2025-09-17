import { FastifyInstance } from 'fastify';
import { authenticate } from '../common/middlewares/authGuard';
import { loginSchema } from './schemas';
import { AuthService } from './service';

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/v1/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const result = await AuthService.login(body.username, body.password);
    return reply.send(result);
  });

  app.get('/v1/auth/me', { preHandler: [authenticate] }, async (request) => {
    const user = await AuthService.getProfile(request.user!.id);
    return user;
  });

  app.post('/v1/auth/logout', { preHandler: [authenticate] }, async () => {
    return { message: 'Logged out' };
  });
}
