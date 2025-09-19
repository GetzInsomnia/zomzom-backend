import type { FastifyReply } from 'fastify';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

import { env } from '../env';

export const REFRESH_COOKIE_NAME = 'refreshToken';

export type AccessTokenPayload = JwtPayload & {
  sub: string;
  [key: string]: unknown;
};

export type RefreshTokenPayload = JwtPayload & {
  sub: string;
  tokenVersion: number;
};

type ReplyCookieOptions = Parameters<FastifyReply['setCookie']>[2];

const getRefreshCookieOptions = (): ReplyCookieOptions => {
  const options: ReplyCookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.COOKIE_SECURE || env.NODE_ENV === 'production',
    path: '/',
  };

  if (typeof env.REFRESH_TOKEN_EXPIRES === 'number') {
    options.maxAge = env.REFRESH_TOKEN_EXPIRES;
  }

  if (env.COOKIE_DOMAIN) {
    options.domain = env.COOKIE_DOMAIN;
  }

  return options;
};

const accessTokenExpiresIn = env.ACCESS_TOKEN_EXPIRES as SignOptions['expiresIn'];
const refreshTokenExpiresIn = env.REFRESH_TOKEN_EXPIRES as SignOptions['expiresIn'];

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: accessTokenExpiresIn,
  });
}

export function signRefreshToken(payload: RefreshTokenPayload) {
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, {
    expiresIn: refreshTokenExpiresIn,
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
