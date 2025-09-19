// src/auth/jwt.ts
import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '../env';

type JwtPayload = {
  id?: string;
  sub?: string;
  username?: string;
  role?: 'ADMIN' | 'USER';
};

export default fp(async function jwtPlugin(app: FastifyInstance) {
  // ให้แน่ใจว่ามี field user บน request
  app.decorateRequest('user', null);

  app.addHook('onRequest', async (request) => {
    const auth = request.headers.authorization;
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
    if (!token) return;

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      request.user = {
        id: String(payload.id ?? payload.sub ?? ''),
        username: String(payload.username ?? ''),
        role: payload.role === 'ADMIN' ? 'ADMIN' : 'USER'
      };
    } catch {
      // ถ้า verify ไม่ผ่าน ปล่อยเป็น anonymous
      request.user = undefined;
    }
  });
});
