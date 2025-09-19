import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';

const ANONYMOUS_SCOPE = '__global__';

export type IdempotencyGuard = (
  request: FastifyRequest,
  reply: FastifyReply
) => Promise<boolean>;

export function ensureIdempotencyKey(app: FastifyInstance, routeId: string): IdempotencyGuard {
  return async (request, reply) => {
    const headerValue = request.headers['idempotency-key'];
    const key = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!key || typeof key !== 'string') {
      return true;
    }

    const userScope = request.user?.id ?? ANONYMOUS_SCOPE;

    try {
      const existing = await prisma.idemKey.findUnique({
        where: {
          route_key_userId: {
            route: routeId,
            key,
            userId: userScope
          }
        }
      });

      if (existing) {
        if (!reply.sent) {
          await reply.code(409).send({ error: 'DUPLICATE_REQUEST' });
        }
        return false;
      }

      await prisma.idemKey.create({
        data: {
          route: routeId,
          key,
          userId: userScope
        }
      });

      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        if (!reply.sent) {
          await reply.code(409).send({ error: 'DUPLICATE_REQUEST' });
        }
        return false;
      }

      app.log.error({ err: error, routeId }, 'Failed to ensure idempotency key');
      throw error;
    }
  };
}
