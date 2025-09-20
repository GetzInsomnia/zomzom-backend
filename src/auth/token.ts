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
    httpOnly: env.REFRESH_COOKIE_HTTP_ONLY,
    sameSite: env.REFRESH_COOKIE_SAME_SITE,
    secure: env.REFRESH_COOKIE_SECURE,
    path: env.REFRESH_COOKIE_PATH
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
