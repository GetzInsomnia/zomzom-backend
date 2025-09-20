# SNIPPETS

Showing first ~150 lines per file.

- ⚠️ Directory missing: src/modules/auth

_Including src/auth directory for coverage._

## src/server.ts
```ts
// src/server.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';

import { env } from './env';
import { prisma } from './prisma/client';
import { errorHandler } from './common/middlewares/errorHandler';
import { registerIdempotencyMiddleware } from './common/idempotency';

// plugins/routes
import jwtPlugin from './auth/jwt';
import { registerAuthRoutes } from './auth/routes';
import { registerPropertyRoutes } from './modules/properties/routes';
import { registerArticleRoutes } from './modules/articles/routes';
import { registerSchedulerRoutes } from './modules/scheduler/routes';
import { registerBackupRoutes } from './modules/backup/routes';
import { registerIndexRoutes } from './modules/index/routes';
import { registerSuggestRoutes } from './modules/suggest/routes';
import { SchedulerService } from './modules/scheduler/service';

async function bootstrap() {
  const app = Fastify({
    logger: true,
    bodyLimit: 1_048_576,
    trustProxy: true
  });

  const allowedOrigins = env.CORS_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:3000');
  }

  await app.register(
    helmet,
    // dev: ปิด CSP เพื่อความสะดวก; prod: เปิด CSP
    { contentSecurityPolicy: env.NODE_ENV === 'production' }
  );

  await app.register(cookie);

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW * 1000,
    hook: 'onRequest'
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      cb(null, allowedOrigins.includes(origin));
    },
    credentials: true
  });

  registerIdempotencyMiddleware(app);

  // global error handler
  app.setErrorHandler(errorHandler);

  // register JWT plugin BEFORE routes
  await app.register(jwtPlugin);

  // liveness
  app.get('/health', async () => ({ ok: true, time: new Date().toISOString() }));

  // readiness (ตี DB จริง)
  app.get('/ready', async (req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true, db: 'up', time: new Date().toISOString() };
    } catch (err) {
      req.log.error({ err }, 'readiness failed');
      reply.code(503);
      return { ok: false, db: 'down' };
    }
  });

  // routes
  await app.register(registerAuthRoutes);
  await app.register(registerPropertyRoutes);
  await app.register(registerArticleRoutes);
  await app.register(registerSchedulerRoutes);
  await app.register(registerBackupRoutes);
  await app.register(registerIndexRoutes);
  await app.register(registerSuggestRoutes);

  // background jobs
  SchedulerService.start(app);

  // graceful DB handling
  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  try {
    // connect DB ก่อนเปิดพอร์ต
    await prisma.$connect();

    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`Server listening on port ${env.PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

bootstrap();

```

## src/auth/emailVerification.service.ts
```ts
import { randomBytes, createHash } from 'crypto';
import { prisma } from '../prisma/client';
import { httpError } from '../common/utils/httpErrors';
import { VerificationTokenRepository } from './verificationToken.repository';

const EMAIL_VERIFICATION_TOKEN_BYTES = 32;
const EMAIL_VERIFICATION_TTL_MS = 60 * 60 * 1000; // 1 hour

export type EmailVerificationIssueResult = {
  token: string;
  expiresAt: Date;
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class EmailVerificationService {
  static async issueToken(userId: string): Promise<EmailVerificationIssueResult> {
    const token = randomBytes(EMAIL_VERIFICATION_TOKEN_BYTES).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

    await prisma.$transaction(async (tx) => {
      await VerificationTokenRepository.deleteExpiredForUser(userId, new Date(), tx);
      await VerificationTokenRepository.create({ userId, tokenHash, expiresAt }, tx);
    });

    return { token, expiresAt };
  }

  static async consumeToken(token: string) {
    const tokenHash = hashToken(token);
    const verification = await VerificationTokenRepository.findByTokenHash(tokenHash);

    if (!verification) {
      throw httpError(400, 'Invalid verification token');
    }

    if (verification.usedAt) {
      throw httpError(400, 'Invalid verification token');
    }

    const now = new Date();
    if (verification.expiresAt.getTime() <= now.getTime()) {
      throw httpError(400, 'Invalid verification token');
    }

    if (!verification.userId) {
      throw httpError(400, 'Invalid verification token');
    }

    await prisma.$transaction(async (tx) => {
      const userId = verification.userId!;
      await VerificationTokenRepository.markUsed(verification.id, now, tx);
      await tx.user.update({
        where: { id: userId },
        data: { isActive: true, emailVerifiedAt: now }
      });
    });

    return { ok: true } as const;
  }
}

```

## src/auth/jwt.ts
```ts
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

import { env } from '../env';
import { prisma } from '../prisma/client';

type UserClaims = {
  sub: string;
  username: string;
  role: $Enums.Role; // Prisma enum
  tv: number;
  iat?: number;
  exp?: number;
};

const jwtPlugin: FastifyPluginAsync = async (app) => {
  const secret = env.ACCESS_TOKEN_SECRET;
  if (secret.length < 32) {
    app.log.warn('ACCESS_TOKEN_SECRET is missing/too short (>=32 chars recommended).');
  }

  // ประกาศ property ที่ runtime ด้วย (ช่วยทั้ง runtime + บอกเจตนา)
  app.decorateRequest('user', null as any);

  const authenticate: preHandlerHookHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) throw new Error('Missing Bearer token');
      const token = auth.slice(7);

      const decoded = jwt.verify(token, secret) as UserClaims;

      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        select: {
          id: true,
          username: true,
          role: true,
          isActive: true,
          tokenVersion: true
        }
      });

      if (!user || !user.isActive) throw new Error('User inactive or missing');
      if (user.tokenVersion !== decoded.tv) {
        throw new Error('Token version mismatch');
      }

      req.user = {
        id: user.id,
        username: user.username,
        role: user.role
      };
    } catch {
      return reply.code(401).send({ error: 'UNAUTHORIZED' });
    }
  };

  app.decorate('authenticate', authenticate);
};

export default fp(jwtPlugin, { name: 'jwt-plugin' });

```

## src/auth/refreshToken.repository.ts
```ts
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../prisma/client';

export type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

const getClient = (client?: PrismaClientOrTx) => client ?? prisma;

export type CreateRefreshTokenParams = {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  rotatedFromId?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt?: Date | null;
};

export class RefreshTokenRepository {
  static async create(data: CreateRefreshTokenParams, client?: PrismaClientOrTx) {
    const db = getClient(client);
    return db.refreshToken.create({
      data: {
        id: data.id,
        userId: data.userId,
        tokenHash: data.tokenHash,
        familyId: data.familyId,
        rotatedFromId: data.rotatedFromId ?? null,
        userAgent: data.userAgent ?? null,
        ipAddress: data.ipAddress ?? null,
        expiresAt: data.expiresAt ?? null
      }
    });
  }

  static async findById(id: string, client?: PrismaClientOrTx) {
    const db = getClient(client);
    return db.refreshToken.findUnique({ where: { id } });
  }

  static async findByTokenHash(tokenHash: string, client?: PrismaClientOrTx) {
    const db = getClient(client);
    return db.refreshToken.findUnique({ where: { tokenHash } });
  }

  static async revoke(id: string, revokedAt: Date, client?: PrismaClientOrTx) {
    const db = getClient(client);
    return db.refreshToken.update({ where: { id }, data: { revokedAt } });
  }

  static async revokeFamily(userId: string, familyId: string, revokedAt: Date, client?: PrismaClientOrTx) {
    const db = getClient(client);
    await db.refreshToken.updateMany({
      where: { userId, familyId, revokedAt: null },
      data: { revokedAt }
    });
  }

  static async deleteForUser(userId: string, client?: PrismaClientOrTx) {
    const db = getClient(client);
    await db.refreshToken.deleteMany({ where: { userId } });
  }
}

```

## src/auth/refreshToken.service.ts
```ts
import { prisma } from '../prisma/client';
import { RefreshTokenRepository } from './refreshToken.repository';
import {
  generateTokenId,
  hashToken,
  signRefreshToken,
  type RefreshTokenPayload
} from './token';

const now = () => new Date();

export class RefreshTokenService {
  static async issueForLogin(params: {
    userId: string;
    tokenVersion: number;
    userAgent?: string | null;
    ipAddress?: string | null;
  }) {
    const tokenId = generateTokenId();
    const familyId = generateTokenId();
    const refreshToken = signRefreshToken({
      sub: params.userId,
      tid: tokenId,
      fid: familyId,
      tv: params.tokenVersion
    });

    await RefreshTokenRepository.create({
      id: tokenId,
      userId: params.userId,
      tokenHash: hashToken(refreshToken),
      familyId,
      userAgent: params.userAgent ?? null,
      ipAddress: params.ipAddress ?? null
    });

    return { refreshToken, familyId, tokenId };
  }

  static async rotate(params: {
    rawToken: string;
    payload: RefreshTokenPayload;
    tokenVersion: number;
    userAgent?: string | null;
    ipAddress?: string | null;
  }) {
    const tokenRecord = await RefreshTokenRepository.findById(params.payload.tid);
    const hashed = hashToken(params.rawToken);
    const timestamp = now();

    if (
      !tokenRecord ||
      tokenRecord.userId !== params.payload.sub ||
      tokenRecord.familyId !== params.payload.fid
    ) {
      await RefreshTokenRepository.revokeFamily(
        params.payload.sub,
        params.payload.fid,
        timestamp
      );
      throw new Error('Refresh token reuse detected');
    }

    if (tokenRecord.tokenHash !== hashed || tokenRecord.revokedAt) {
      await RefreshTokenRepository.revokeFamily(
        tokenRecord.userId,
        tokenRecord.familyId,
        timestamp
      );
      throw new Error('Refresh token reuse detected');
    }

    const newTokenId = generateTokenId();
    const refreshToken = signRefreshToken({
      sub: params.payload.sub,
      tid: newTokenId,
      fid: tokenRecord.familyId,
      tv: params.tokenVersion
    });
    const refreshTokenHash = hashToken(refreshToken);

    await prisma.$transaction(async (tx) => {
      await RefreshTokenRepository.revoke(tokenRecord.id, timestamp, tx);
      await RefreshTokenRepository.create(
        {
          id: newTokenId,
          userId: tokenRecord.userId,
          tokenHash: refreshTokenHash,
          familyId: tokenRecord.familyId,
          rotatedFromId: tokenRecord.id,
          userAgent: params.userAgent ?? null,
          ipAddress: params.ipAddress ?? null
        },
        tx
      );
    });

    return refreshToken;
  }

  static async revokeActive(params: {
    rawToken: string;
    payload: RefreshTokenPayload;
  }) {
    const tokenRecord = await RefreshTokenRepository.findById(params.payload.tid);
    const timestamp = now();

    if (!tokenRecord) {
      await RefreshTokenRepository.revokeFamily(
        params.payload.sub,
        params.payload.fid,
        timestamp
      );
      return;
    }

    if (tokenRecord.userId !== params.payload.sub || tokenRecord.familyId !== params.payload.fid) {
      await RefreshTokenRepository.revokeFamily(
        params.payload.sub,
        params.payload.fid,
        timestamp
      );
      return;
    }

    if (tokenRecord.tokenHash !== hashToken(params.rawToken)) {
      await RefreshTokenRepository.revokeFamily(
        tokenRecord.userId,
        tokenRecord.familyId,
        timestamp
      );
      return;
    }

    await RefreshTokenRepository.revoke(tokenRecord.id, timestamp);
  }
}

```

## src/auth/routes.ts
```ts
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
...
```

## src/auth/schemas.ts
```ts
import { z } from 'zod';

export const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Username or email is required'),
  password: z.string().min(8)
});

export const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(191)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username may only contain letters, numbers, underscores, hyphens, and dots'),
  email: z.string().email(),
  password: z.string().min(8)
});

export const verificationRequestSchema = z.object({
  email: z.string().email()
});

export const verificationConfirmSchema = z.object({
  token: z
    .string()
    .min(1, 'Token is required')
    .regex(/^[a-f0-9]{64}$/i, 'Token must be a 64-character hex string')
});

export const revokeAllSessionsSchema = z.object({}).strict();

```

## src/auth/service.ts
```ts
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma/client';
import { env } from '../env';
import { httpError } from '../common/utils/httpErrors';
import { Role } from '../prisma/types';
import { createAuditLog } from '../common/utils/audit';

const BCRYPT_SALT_ROUNDS = 10;

export class AuthService {
  static async login(
    usernameOrEmail: string,
    password: string,
    ipAddress?: string | null
  ) {
    const logAttempt = async (
      success: boolean,
      params: { userId?: string | null; reason?: string }
    ) => {
      try {
        await createAuditLog(prisma, {
          userId: params.userId ?? null,
          action: success ? 'auth.login.success' : 'auth.login.failure',
          entityType: 'Auth',
          entityId: params.userId ?? null,
          meta: { usernameOrEmail, reason: params.reason ?? null },
          ipAddress: ipAddress ?? null
        });
      } catch (error) {
        // Logging failures should not block authentication flow
        console.warn('Failed to record auth attempt', error);
      }
    };

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }]
      }
    });

    if (!user) {
      const userCount = await prisma.user.count();
      const hasFallbackCreds = Boolean(env.ADMIN_FALLBACK_USERNAME && env.ADMIN_FALLBACK_PASSWORD);

      if (userCount === 0 && hasFallbackCreds) {
        if (
          usernameOrEmail === env.ADMIN_FALLBACK_USERNAME &&
          password === env.ADMIN_FALLBACK_PASSWORD
        ) {
          const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
          user = await prisma.user.create({
            data: {
              username: env.ADMIN_FALLBACK_USERNAME!,
              passwordHash,
              role: 'ADMIN',
              isActive: true,
              tokenVersion: 0
            }
          });
        } else {
          await logAttempt(false, { reason: 'invalid_fallback_credentials' });
          throw httpError(401, 'Invalid credentials');
        }
      } else {
        await logAttempt(false, { reason: 'user_not_found' });
        throw httpError(401, 'Invalid credentials');
      }
    }

    const authenticatedUser = user!;

    if (!authenticatedUser.isActive) {
      await logAttempt(false, { userId: authenticatedUser.id, reason: 'inactive' });
      throw httpError(401, 'Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, authenticatedUser.passwordHash);
    if (!isValid) {
      await logAttempt(false, { userId: authenticatedUser.id, reason: 'invalid_password' });
      throw httpError(401, 'Invalid credentials');
    }

    await logAttempt(true, { userId: authenticatedUser.id });

    return {
      id: authenticatedUser.id,
      username: authenticatedUser.username,
      email: authenticatedUser.email,
      role: authenticatedUser.role as Role,
      tokenVersion: authenticatedUser.tokenVersion
    };
  }

  static async register(params: { username: string; email: string; password: string }) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: params.username }, { email: params.email }]
      }
    });

    if (existingUser) {
      throw httpError(400, 'Username or email already taken');
    }

    const passwordHash = await bcrypt.hash(params.password, BCRYPT_SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        username: params.username,
        email: params.email,
        passwordHash,
        role: 'USER',
        isActive: false,
        tokenVersion: 0
      }
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role as Role,
      tokenVersion: user.tokenVersion
    };
  }

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    if (!user) {
      throw httpError(404, 'User not found');
    }

    return {
      ...user,
      role: user.role as Role
    };
  }
}

```

## src/auth/token.ts
```ts
import { createHash, randomUUID } from 'crypto';
import type { FastifyReply } from 'fastify';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

import { env } from '../env';

export const REFRESH_COOKIE_NAME = 'rt';

export type AccessTokenPayload = JwtPayload & {
  sub: string;
  username: string;
  role: string;
  tv: number;
};

export type RefreshTokenPayload = JwtPayload & {
  sub: string;
  tid: string;
  fid: string;
  tv: number;
};

export const generateTokenId = () => randomUUID();

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

type ReplyCookieOptions = Parameters<FastifyReply['setCookie']>[2];

const getRefreshCookieOptions = (): ReplyCookieOptions => {
  const options: ReplyCookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/v1/auth/refresh'
  };

  if (env.REFRESH_COOKIE_DOMAIN) {
    options.domain = env.REFRESH_COOKIE_DOMAIN;
  }

  return options;
};

const accessTokenExpiresIn = env.ACCESS_TOKEN_EXPIRES_IN as SignOptions['expiresIn'];
const refreshTokenExpiresIn = env.REFRESH_TOKEN_EXPIRES_IN as SignOptions['expiresIn'];

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
    expiresIn: accessTokenExpiresIn
  });
}

export function signRefreshToken(payload: RefreshTokenPayload) {
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, {
    expiresIn: refreshTokenExpiresIn
  });
}

export function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie(REFRESH_COOKIE_NAME, token, getRefreshCookieOptions());
}

export function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
}

export function verifyRefresh(token: string) {
  const decoded = jwt.verify(token, env.REFRESH_TOKEN_SECRET);

  if (!decoded || typeof decoded !== 'object') {
    throw new Error('Invalid refresh token payload');
  }

  return decoded as RefreshTokenPayload;
}

```

## src/auth/verificationToken.repository.ts
```ts
import type { Prisma, PrismaClient, VerificationToken } from '@prisma/client';
import { prisma } from '../prisma/client';

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

type CreateVerificationParams = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  email?: string | null;
};

const getClient = (client?: PrismaClientOrTx) => client ?? prisma;

export class VerificationTokenRepository {
  static async create(
    data: CreateVerificationParams,
    client?: PrismaClientOrTx
  ): Promise<VerificationToken> {
    const db = getClient(client);
    return db.verificationToken.create({ data });
  }

  static async findByTokenHash(
    tokenHash: string,
    client?: PrismaClientOrTx
  ): Promise<VerificationToken | null> {
    const db = getClient(client);
    return db.verificationToken.findUnique({ where: { tokenHash } });
  }

  static async markUsed(
    id: string,
    usedAt: Date,
    client?: PrismaClientOrTx
  ): Promise<VerificationToken> {
    const db = getClient(client);
    return db.verificationToken.update({ where: { id }, data: { usedAt } });
  }

  static async deleteExpiredForUser(
    userId: string,
    now: Date,
    client?: PrismaClientOrTx
  ): Promise<number> {
    const db = getClient(client);
    const result = await db.verificationToken.deleteMany({
      where: {
        userId,
        OR: [
          { expiresAt: { lt: now } },
          { usedAt: { not: null } }
        ]
      }
    });
    return result.count;
  }
}

```

## src/common/idempotency.ts
```ts
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
...
```

## prisma/schema.prisma
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider          = "mysql"
  url               = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}

enum Role {
  ADMIN
  EDITOR
  AGENT
  USER
}

enum PropertyFlag {
  NEGOTIABLE
  SPECIAL_PRICE
  NET_PRICE
  MEET_IN_PERSON
  NO_LIEN
  LIENED
}

enum WorkflowState {
  DRAFT
  REVIEW
  SCHEDULED
  PUBLISHED
  HIDDEN
  ARCHIVED
}

enum PropertyType {
  HOUSE
  TOWNHOME
  COMMERCIAL
  TWINHOUSE
  AFFORDABLE
  FLAT
  CONDO
  ROOM
  LAND
  COURSE
  FORM
  OTHER
}

enum PropertyStatus {
  AVAILABLE
  RESERVED
  SOLD
}

model User {
  id           String    @id @default(cuid())
  username     String    @unique
  email        String?   @unique
  passwordHash String
  role         Role      @default(ADMIN)
  localePref   String?   // admin UI locale
  isActive     Boolean   @default(true)
  tokenVersion Int       @default(0)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  emailVerifiedAt DateTime?
  auditLogs    AuditLog[]
  changeSets   ChangeSet[] @relation("ChangeSetCreatedBy")
  favorites    Favorite[]
  verificationTokens VerificationToken[]
  refreshTokens      RefreshToken[]
}

model VerificationToken {
  id         String   @id @default(cuid())
  userId     String?
  email      String?
  tokenHash  String
  expiresAt  DateTime
  usedAt     DateTime?
  createdAt  DateTime @default(now())
  user       User?    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([email])
  @@unique([tokenHash])
}

model Property {
  id              String                 @id @default(cuid())
  slug            String                 @unique
  status          PropertyStatus         @default(AVAILABLE)
  type            PropertyType
  price           Int
  area            Float?
  beds            Int?
  baths           Int?
  furnished       Boolean?               @default(false)
  locationId      String?
  location        Location?              @relation(fields: [locationId], references: [id])
  createdAt       DateTime               @default(now())
  updatedAt       DateTime               @updatedAt
  reservedUntil   DateTime?
  deposit         Boolean                @default(false)
  workflowState   WorkflowState          @default(DRAFT)
  workflowChangedAt DateTime             @default(now())
  publishedAt     DateTime?
  scheduledAt     DateTime?
  hiddenAt        DateTime?
  isHidden        Boolean                @default(false)
  deletedAt       DateTime?
  images          PropertyImage[]
  i18n            PropertyI18N[]
  flags           PropertyFlagOnProperty[]
  favorites       Favorite[]
  viewStats       ViewStat[]
  transitStations PropertyTransitStation[]

  @@index([status, type, price])
  @@index([status, type, updatedAt])
  @@index([status, type, price, updatedAt])
  @@index([locationId])
}

model PropertyImage {
  id         String   @id @default(cuid())
  propertyId String
  url        String
  variants   Json?
  order      Int      @default(0)
  property   Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  @@unique([propertyId, order])
  @@index([propertyId, order])
}

model PropertyI18N {
  id          String   @id @default(cuid())
  propertyId  String
  locale      String
  title       String
  description String?
  amenities   Json?
  property    Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  @@unique([propertyId, locale])
  @@index([locale, propertyId])
}
...
```

## docker-compose.yml
```yml
version: '3.8'
services:
  api:
    build:
      context: .
    image: zomzom-backend:latest
    depends_on:
      db:
        condition: service_healthy
    env_file:
      - ./.env
    environment:
      DATABASE_URL: ${DATABASE_URL:-mysql://zomzom:zomzompass@db:3306/zomzom}
    command: >-
      sh -c "npx prisma migrate deploy && node dist/server.js"
    ports:
      - "${PORT:-4000}:${PORT:-4000}"
    volumes:
      - ./public:/app/public
    restart: unless-stopped

  db:
    image: mysql:8
    container_name: zomzom_mysql
    restart: unless-stopped
    env_file:
      - ./.env
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-rootpass}
      MYSQL_DATABASE: ${MYSQL_DATABASE:-zomzom}
      MYSQL_USER: ${MYSQL_USER:-zomzom}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-zomzompass}
    ports:
      - "${MYSQL_PORT:-3307}:3306"   # expose local ${MYSQL_PORT} → container 3306
    volumes:
      - dbdata:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    # Default MySQL credentials: `zomzom` / `zomzompass` (user), `root` / `rootpass` (root)

volumes:
  dbdata:

```
