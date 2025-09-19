// src/global.d.ts
import 'fastify';
import type { $Enums } from '@prisma/client';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      username: string;
      role: $Enums.Role;  // Prisma enum
    };
    previewMode?: boolean;
    cookies: Record<string, string | undefined>;
  }

  interface FastifyInstance {
    authenticate: import('fastify').preHandlerHookHandler;
  }
}
