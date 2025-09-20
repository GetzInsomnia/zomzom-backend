/// <reference path="../global.d.ts" />
import type { FastifyPluginAsync } from 'fastify';
import { issueCsrfToken } from '../common/middlewares/csrf';
import {
  loginSchema,
  registerSchema,
  verificationRequestSchema,
  verificationConfirmSchema,
  revokeAllSessionsSchema
} from './schemas';
import { AuthService } from './service';
import { RefreshTokenService } from './refreshToken.service';
import { RefreshTokenRepository } from './refreshToken.repository';
import { EmailVerificationService } from './emailVerification.service';
import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookie,
  setRefreshCookie,
  signAccessToken,
  verifyRefresh
} from './token';
import { prisma } from '../prisma/client';

export const registerAuthRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/v1/auth/register',
    async (request, reply) => {
      const body = registerSchema.parse(request.body);

      const user = await AuthService.register(body);

      const { token, expiresAt } = await EmailVerificationService.issueToken(user.id);
      const verificationPath = `/v1/auth/verify/confirm?token=${token}`;
      request.log.info(
        {
          userId: user.id,
          email: user.email,
          expiresAt: expiresAt.toISOString(),
          verificationUrl: verificationPath
        },
        'Verification email issued'
      );

      console.log(`Verification link for ${user.email}: ${verificationPath}`);

      return reply.code(201).send({ ok: true });
    }
  );

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
      const body = loginSchema.parse(request.body);
      const userAgent = request.headers['user-agent'] ?? null;
      const user = await AuthService.login(body.usernameOrEmail, body.password, request.ip);
      const accessToken = signAccessToken({
        sub: user.id,
        role: user.role,
        username: user.username,
        tv: user.tokenVersion
      });
      const { refreshToken } = await RefreshTokenService.issueForLogin({
        userId: user.id,
        tokenVersion: user.tokenVersion,
        userAgent,
        ipAddress: request.ip
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
    if (!request.user) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' });
    }

    const token = request.cookies?.[REFRESH_COOKIE_NAME];
    if (token) {
      try {
        const payload = verifyRefresh(token);
        await RefreshTokenService.revokeActive({ rawToken: token, payload });
      } catch (error) {
        request.log.warn({ err: error }, 'Failed to revoke refresh token on logout');
      }
    }

    clearRefreshCookie(reply);
    return { ok: true };
  });

  app.post(
    '/v1/auth/verify/request',
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: 60 * 60 * 1000,
          keyGenerator: (request) => request.ip
        }
      }
    },
    async (request, reply) => {
      const { email } = verificationRequestSchema.parse(request.body);

      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, emailVerifiedAt: true }
      });

      if (!user) {
        return reply.send({ ok: true, alreadyVerified: false });
      }

      if (user.emailVerifiedAt) {
        return reply.send({ ok: true, alreadyVerified: true });
      }

      const { token, expiresAt } = await EmailVerificationService.issueToken(user.id);
      const verificationPath = `/v1/auth/verify/confirm?token=${token}`;

      request.log.info(
        {
          userId: user.id,
          email,
          expiresAt: expiresAt.toISOString(),
          verificationUrl: verificationPath
        },
        'Verification email issued'
      );
      console.log(`Verification link for ${email}: ${verificationPath}`);

      return reply.send({ ok: true, alreadyVerified: false });
    }
  );

  app.post('/v1/auth/verify/confirm', async (request, reply) => {
    const { token } = verificationConfirmSchema.parse(request.body);

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
      clearRefreshCookie(reply);
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
      clearRefreshCookie(reply);
      return reply.code(403).send({ error: 'FORBIDDEN' });
    }

    if (user.tokenVersion !== payload.tv) {
      clearRefreshCookie(reply);
      return reply.code(403).send({ error: 'FORBIDDEN' });
    }
    let refreshToken: string;
    try {
      refreshToken = await RefreshTokenService.rotate({
        rawToken: token,
        payload,
        tokenVersion: user.tokenVersion,
        userAgent: request.headers['user-agent'] ?? null,
        ipAddress: request.ip
      });
    } catch (error) {
      request.log.warn({ err: error }, 'Refresh token reuse detected, revoking family');
      clearRefreshCookie(reply);
      return reply.code(403).send({ error: 'FORBIDDEN' });
    }

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      username: user.username,
      tv: user.tokenVersion
    });

    setRefreshCookie(reply, refreshToken);

    return reply.send({ accessToken });
  });

  app.post(
    '/v1/auth/revoke-all',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({ error: 'UNAUTHORIZED' });
      }

      revokeAllSessionsSchema.parse(request.body ?? {});

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: request.user!.id },
          data: { tokenVersion: { increment: 1 } }
        });
        await RefreshTokenRepository.deleteForUser(request.user!.id, tx);
      });

      clearRefreshCookie(reply);

      return reply.send({ ok: true });
    }
  );
};
