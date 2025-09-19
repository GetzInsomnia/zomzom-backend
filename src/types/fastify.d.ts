// src/types/fastify.d.ts
import 'fastify';

export type UserClaims = {
  id: string;
  username: string;
  role?: 'ADMIN' | 'USER';
};

declare module 'fastify' {
  interface FastifyRequest {
    user?: UserClaims;
    previewMode?: boolean;
    cookies: Record<string, string | undefined>;
  }
}
