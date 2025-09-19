/// <reference path="../global.d.ts" />
import type { FastifyPluginAsync } from 'fastify';
import { clearCsrfCookie, issueCsrfToken } from '../common/middlewares/csrf';
import { loginSchema, verifyEmailQuerySchema } from './schemas';
import { AuthService } from './service';
import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookie,
  setRefreshCookie,
  signAccessToken,
  signRefreshToken,
  verifyRefresh
} from './token';
import { ensureIdempotencyKey } from '../common/idempotency';
import { prisma } from '../prisma/client';
import { EmailVerificationService } from './emailVerification.service';

export const registerAuthRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/v1/auth/login',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: 15 * 60 * 1000,
          keyGenerator: (request) => request.ip
        }
      }
    },
    async (request, reply) => {
      const guard = ensureIdempotencyKey(app, 'auth.login');
      if (!(await guard(request, reply))) {
        return;
      }
      const body = loginSchema.parse(request.body);
      const user = await AuthService.login(body.username, body.password, request.ip);
      const accessToken = signAccessToken({
        sub: user.id,
        role: user.role,
        username: user.username
      });
      const refreshToken = signRefreshToken({
        sub: user.id,
        tokenVersion: user.tokenVersion
      });

      setRefreshCookie(reply, refreshToken);

      const csrfToken = issueCsrfToken(reply);
      return reply.send({ accessToken, user, csrfToken });
    }
  );

  app.get('/v1/auth/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: 'UNAUTHORIZED' });
    return { user: req.user };
  });

  app.post('/v1/auth/logout', { preHandler: [app.authenticate] }, async (request, reply) => {
    const guard = ensureIdempotencyKey(app, 'auth.logout');
    if (!(await guard(request, reply))) {
      return;
    }
    if (!request.user) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' });
    }

    await prisma.user.update({
      where: { id: request.user.id },
      data: { tokenVersion: { increment: 1 } }
    });

    clearRefreshCookie(reply);
    return { ok: true };
  });

  app.post(
    '/v1/auth/send-verify-email',
    {
      preHandler: [app.authenticate],
      config: {
        rateLimit: {
          max: 3,
          timeWindow: 60 * 60 * 1000,
          keyGenerator: (request) => request.headers.authorization ?? request.ip
        }
      }
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({ error: 'UNAUTHORIZED' });
      }

      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: { id: true, isActive: true }
      });

      if (!user) {
        return reply.code(404).send({ error: 'USER_NOT_FOUND' });
      }

      if (user.isActive) {
        return reply.send({ ok: true, alreadyVerified: true });
      }

      const { token, expiresAt } = await EmailVerificationService.issueToken(user.id);

      // TODO: Integrate email delivery to send `token` to the user's email address.
      request.log.info(
        { userId: user.id, expiresAt: expiresAt.toISOString() },
        'Email verification token issued'
      );

      return reply.send({ ok: true, alreadyVerified: false });
    }
  );

  app.get('/v1/auth/verify-email', async (request, reply) => {
    const { token } = verifyEmailQuerySchema.parse(request.query);

    await EmailVerificationService.consumeToken(token);

    return reply.send({ ok: true });
  });

  app.post('/v1/auth/refresh', async (request, reply) => {
    const token = request.cookies?.[REFRESH_COOKIE_NAME];

    if (!token) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' });
    }

    let payload;
    try {
      payload = verifyRefresh(token);
    } catch (error) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        tokenVersion: true
      }
    });

    if (!user || !user.isActive) {
      return reply.code(403).send({ error: 'FORBIDDEN' });
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      return reply.code(403).send({ error: 'FORBIDDEN' });
    }

    const refreshToken = signRefreshToken({ sub: user.id, tokenVersion: user.tokenVersion });
    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      username: user.username
    });

    setRefreshCookie(reply, refreshToken);

    return reply.send({ accessToken });
  });
};
