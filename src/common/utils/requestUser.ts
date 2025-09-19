import type { FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import type { $Enums } from '@prisma/client';

import { env } from '../../env';

type UserClaims = {
  sub: string;
  username: string;
  role: $Enums.Role;
};

export async function getUserFromRequest(req: FastifyRequest) {
  if (req.user) {
    return req.user;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const secret = env.ACCESS_TOKEN_SECRET;
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
