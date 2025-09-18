import crypto from 'crypto';
import { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../../env';
import { httpError } from '../utils/httpErrors';

export const CSRF_COOKIE_NAME = 'csrfToken';
export const CSRF_HEADER_NAME = 'x-csrf-token';

export function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function issueCsrfToken(reply: FastifyReply) {
  const token = generateCsrfToken();
  setCsrfCookie(reply, token);
  return token;
}

export function clearCsrfCookie(reply: FastifyReply) {
  reply.clearCookie(CSRF_COOKIE_NAME, {
    path: '/',
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production'
  });
}

export function setCsrfCookie(reply: FastifyReply, token: string) {
  reply.setCookie(CSRF_COOKIE_NAME, token, {
    path: '/',
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    httpOnly: false,
    maxAge: 15 * 60 // match login token lifetime
  });
}

export async function verifyCsrfToken(request: FastifyRequest) {
  const cookieToken = request.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = request.headers[CSRF_HEADER_NAME] as string | undefined;

  if (!cookieToken || typeof cookieToken !== 'string') {
    throw httpError(403, 'Missing CSRF token');
  }

  if (!headerToken || typeof headerToken !== 'string') {
    throw httpError(403, 'Missing CSRF token header');
  }

  if (cookieToken !== headerToken) {
    throw httpError(403, 'Invalid CSRF token');
  }
}
