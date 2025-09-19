/// <reference path="../global.d.ts" />
import fp from 'fastify-plugin';
import type {
  FastifyPluginAsync,
  FastifyRequest,
  FastifyReply,
  preHandlerHookHandler
} from 'fastify';
import jwt from 'jsonwebtoken';
import type { $Enums } from '@prisma/client';

type UserClaims = {
  sub: string;
  username: string;
  role: $Enums.Role; // Prisma enum
  iat?: number;
  exp?: number;
};

const jwtPlugin: FastifyPluginAsync = async (app) => {
  const secret = process.env.JWT_SECRET || '';
  if (secret.length < 32) {
    app.log.warn('JWT_SECRET is missing/too short (>=32 chars recommended).');
  }

  // ประกาศ property ที่ runtime ด้วย (ช่วยทั้ง runtime + บอกเจตนา)
  app.decorateRequest('user', null as any);

  const authenticate: preHandlerHookHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) throw new Error('Missing Bearer token');
      const token = auth.slice(7);

      const decoded = jwt.verify(token, secret) as UserClaims;
      req.user = {
        id: decoded.sub,
        username: decoded.username,
        role: decoded.role
      };
    } catch {
      return reply.code(401).send({ error: 'UNAUTHORIZED' });
    }
  };

  app.decorate('authenticate', authenticate);
};

export default fp(jwtPlugin, { name: 'jwt-plugin' });
