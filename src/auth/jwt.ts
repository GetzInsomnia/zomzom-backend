import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '../env';
import type { UserClaims } from '../types/fastify';

export default fp(async function jwtPlugin(app: FastifyInstance) {
  // ให้แน่ใจว่ามี field user บน request (runtime)
  app.decorateRequest('user', null);

  app.addHook('onRequest', async (request) => {
    try {
      const auth = request.headers.authorization;
      const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
      if (!token) return;

      const payload = jwt.verify(token, env.JWT_SECRET) as UserClaims | any;
      // ใส่ค่าแบบบางส่วนก็พอ
      request.user = {
        id: String(payload.id ?? payload.sub ?? ''),
        username: String(payload.username ?? ''),
        role: payload.role === 'ADMIN' ? 'ADMIN' : 'USER'
      };
    } catch {
      // ไม่ต้อง throw ปล่อยผ่านเป็น anonymous ได้
      request.user = undefined;
    }
  });
});
