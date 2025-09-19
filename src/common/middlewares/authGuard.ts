/// <reference path="../../global.d.ts" />
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { $Enums } from '@prisma/client';

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
