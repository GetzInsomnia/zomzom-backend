import { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '../../env';
import { prisma } from '../../prisma/client';
import { Role } from '../../prisma/types';
import { httpError } from '../utils/httpErrors';

export interface TokenPayload {
  sub: string;
  role: Role;
  username: string;
  iat: number;
  exp: number;
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw httpError(401, 'Unauthorized');
  }

  const token = authHeader.substring('Bearer '.length);

  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw httpError(401, 'Invalid token');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub }
  });

  if (!user || !user.isActive) {
    throw httpError(401, 'User is inactive or not found');
  }

  request.user = {
    id: user.id,
    username: user.username,
    role: user.role as Role
  };
}

export function roleGuard(roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw httpError(401, 'Unauthorized');
    }

    if (!roles.includes(request.user.role as Role)) {
      throw httpError(403, 'Forbidden');
    }
  };
}
