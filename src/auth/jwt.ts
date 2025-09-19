import fp from 'fastify-plugin';
import type { FastifyPluginCallback } from 'fastify';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../env'; // ต้องมี JWT_SECRET ใน env

// shape ของ payload ที่เราจะฝังใน token
export type UserClaims = {
  id: string;
  username: string;
  role: string; // ใช้ string ให้ยืดหยุ่น หรือจะเปลี่ยนเป็น Role ก็ได้ถ้าแน่ใจว่าตรง schema
};

const BearerRx = /^Bearer\s+(.+)$/i;

const plugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.decorate('authenticate', async (req, reply) => {
    try {
      const auth = req.headers.authorization || '';
      const m = auth.match(BearerRx);
      if (!m) {
        reply.code(401).send({ error: 'Missing Authorization header' });
        return;
      }
      const token = m[1];
      const decoded = jwt.verify(token, env.JWT_SECRET) as UserClaims;
      req.user = decoded;
    } catch (err) {
      reply.code(401).send({ error: 'Invalid token' });
    }
  });

  done();
};

export default fp(plugin, { name: 'jwt-auth' });
