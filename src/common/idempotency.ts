import type { FastifyInstance, FastifyRequest } from 'fastify';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';

const IDEMPOTENT_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const IDEMPOTENCY_HEADER = 'idempotency-key';
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // hourly

function canonicalize(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null) {
    return null;
  }

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'object') {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Buffer.isBuffer(value)) {
    return value.toString('base64');
  }

  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item, seen));
  }

  if (seen.has(value as object)) {
    return null;
  }

  seen.add(value as object);
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => [key, canonicalize(val, seen)]);
  seen.delete(value as object);
  return Object.fromEntries(entries);
}

function canonicalJson(value: unknown): string | null {
  if (value === undefined) {
    return null;
  }

  if (value === null) {
    return 'null';
  }

  try {
    const normalized = canonicalize(value, new WeakSet());
    return JSON.stringify(normalized);
  } catch {
    return null;
  }
}

function hashCanonical(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return createHash('sha256').update(value).digest('hex');
}

function toJsonInput(
  value: string | null
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === null) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed === null) {
      return Prisma.JsonNull;
    }

    return parsed as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

function getRequestPath(request: FastifyRequest): string {
  return (
    (request.routerPath as string | undefined) ??
    request.routeOptions?.url ??
    request.raw.url ??
    request.url
  );
}

async function cleanupExpiredKeys(app: FastifyInstance) {
  try {
    const now = new Date();
    await prisma.idempotencyKey.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    });
  } catch (error) {
    app.log.error({ err: error }, 'Failed to cleanup expired idempotency keys');
  }
}

export function registerIdempotencyMiddleware(app: FastifyInstance): void {
  let cleanupTimer: NodeJS.Timeout | undefined;

  void cleanupExpiredKeys(app);

  cleanupTimer = setInterval(() => {
    void cleanupExpiredKeys(app);
  }, CLEANUP_INTERVAL_MS);

  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  app.addHook('onClose', async () => {
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
    }
  });

  app.addHook('onError', async (request) => {
    const recordId = request.idempotencyKeyRecordId;
    if (!recordId) {
      return;
    }

    try {
      await prisma.idempotencyKey.delete({
        where: { id: recordId }
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
      ) {
        request.log.error(
          { err: error, idempotencyKeyId: recordId },
          'Failed to cleanup idempotency key after error'
        );
      }
    }
  });

  app.addHook('preHandler', async (request, reply) => {
    const method = request.method.toUpperCase();
    if (!IDEMPOTENT_METHODS.has(method)) {
      return;
    }

    const headerValue = request.headers[IDEMPOTENCY_HEADER];
    const key = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      return;
    }

    const normalizedKey = key.trim();
    const path = getRequestPath(request);
    const canonicalRequestBody = canonicalJson(request.body);
    const requestBodyHash = hashCanonical(canonicalRequestBody);
    const now = new Date();

    let existing = await prisma.idempotencyKey.findUnique({
      where: {
        key_method_path: {
          key: normalizedKey,
          method,
          path
        }
      }
    });

    if (existing && existing.expiresAt && existing.expiresAt <= now) {
      try {
        await prisma.idempotencyKey.delete({ where: { id: existing.id } });
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
        ) {
          request.log.warn(
            { err: error, idempotencyKeyId: existing.id },
            'Failed to remove expired idempotency key'
          );
        }
      }
      existing = null;
    }

    if (existing) {
      if ((existing.requestBodyHash ?? null) !== (requestBodyHash ?? null)) {
        reply.code(409);
        await reply.send({ error: 'IDEMPOTENCY_KEY_CONFLICT' });
        return;
      }

      if (existing.status !== null && existing.status !== undefined) {
        reply.code(existing.status);

        if (
          existing.status === 204 ||
          typeof existing.responseJson === 'undefined'
        ) {
          await reply.send();
        } else {
          await reply.send(existing.responseJson);
        }
      } else {
        reply.code(409);
        await reply.send({ error: 'DUPLICATE_REQUEST' });
      }

      return;
    }

    let created;

    try {
      created = await prisma.idempotencyKey.create({
        data: {
          key: normalizedKey,
          method,
          path,
          requestBody: toJsonInput(canonicalRequestBody),
          requestBodyHash,
          expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
          userId: request.user?.id ?? null,
          ipAddress: request.ip,
          userAgent:
            typeof request.headers['user-agent'] === 'string'
              ? request.headers['user-agent']
              : null
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const latest = await prisma.idempotencyKey.findUnique({
          where: {
            key_method_path: {
              key: normalizedKey,
              method,
              path
            }
          }
        });

        if (latest && (latest.requestBodyHash ?? null) !== (requestBodyHash ?? null)) {
          reply.code(409);
          await reply.send({ error: 'IDEMPOTENCY_KEY_CONFLICT' });
          return;
        }

        if (latest && latest.status !== null && latest.status !== undefined) {
          reply.code(latest.status);
          if (
            latest.status === 204 ||
            typeof latest.responseJson === 'undefined'
          ) {
            await reply.send();
          } else {
            await reply.send(latest.responseJson);
          }
          return;
        }

        reply.code(409);
        await reply.send({ error: 'DUPLICATE_REQUEST' });
        return;
      }

      request.log.error({ err: error }, 'Failed to initialize idempotency key');
      throw error;
    }

    request.idempotencyKeyRecordId = created.id;

    const originalSend = reply.send.bind(reply);
    let finalized = false;

    reply.send = function patchedSend(payload) {
      if (!finalized) {
        finalized = true;

        const statusCode = reply.statusCode;

        void (async () => {
          try {
            if (statusCode >= 200 && statusCode < 400) {
              const canonicalResponse = canonicalJson(payload);
              const responseJson = toJsonInput(canonicalResponse);
              const responseHash = hashCanonical(canonicalResponse);

              await prisma.idempotencyKey.update({
                where: { id: created.id },
                data: {
                  status: statusCode,
                  responseJson,
                  responseHash,
                  expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS)
                }
              });
            } else {
              await prisma.idempotencyKey.delete({ where: { id: created.id } });
            }
            request.idempotencyKeyRecordId = undefined;
          } catch (error) {
            if (
              !(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
            ) {
              request.log.error(
                { err: error, idempotencyKeyId: created.id },
                'Failed to finalize idempotency key'
              );
            }
          }
        })();
      }

      return originalSend(payload);
    };
  });
}
