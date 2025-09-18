import 'fastify';
import { Role } from '../prisma/types';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      username: string;
      role: Role;
    };
    previewMode?: boolean;
    cookies: Record<string, string | undefined>;
  }
}
