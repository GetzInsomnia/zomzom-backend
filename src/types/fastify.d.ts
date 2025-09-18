import 'fastify';
import { Role } from '../prisma/types';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      username: string;
      role: Role;
    };
    cookies: Record<string, string | undefined>;
  }
}
