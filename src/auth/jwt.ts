// src/auth/jwt.ts
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import jwt from 'jsonwebtoken';
import type { $Enums } from '@prisma/client';

type UserClaims = {
  sub: string;       // user id
  username: string;
  role: $Enums.Role; // Prisma enum type
  iat?: number;
  exp?: number;
};

const jwtPlugin: FastifyPluginAsync = async (app) => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    app.log.warn('JWT_SECRET is missing or too short (>=32). Auth may fail.');
  }

  app.decorate('authenticate', async (req, reply) => {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) throw new Error('Missing Bearer token');
      const token = auth.slice(7);

      const decoded = jwt.verify(token, secret!) as UserClaims;

      // แน่ใจว่าตรง enum ของ Prisma
      const role = decoded.role as $Enums.Role;

      req.user = {
        id: decoded.sub,
        username: decoded.username,
        role
      };
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });
};

export default fp(jwtPlugin, { name: 'jwt-plugin' });
