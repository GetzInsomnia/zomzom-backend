/// <reference path="../../global.d.ts" />
import type { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import type { $Enums } from '@prisma/client';

type UserClaims = {
  sub: string;
  username: string;
  role: $Enums.Role;
};

export async function authGuard(req: FastifyRequest, reply: FastifyReply) {
  if (!req.user) {
    return reply.code(401).send({ error: 'UNAUTHORIZED' });
  }
}

export function roleGuard(roles: $Enums.Role[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' });
    }
    if (!roles.includes(req.user.role)) {
      return reply.code(403).send({ error: 'FORBIDDEN' });
    }
  };
}

export async function getUserFromRequest(req: FastifyRequest) {
  if (req.user) {
    return req.user;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const secret = process.env.JWT_SECRET || '';
  if (!secret) {
    return null;
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, secret) as UserClaims;
    return {
      id: decoded.sub,
      username: decoded.username,
      role: decoded.role
    };
  } catch {
    return null;
  }
}
