// src/types/fastify.d.ts
import 'fastify';
import type { $Enums } from '@prisma/client';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      username: string;
      role: $Enums.Role; // ใช้ enum ของ Prisma
    };
    previewMode?: boolean;
    cookies: Record<string, string | undefined>;
  }

  interface FastifyInstance {
    // ให้ TS รู้จัก method ที่ปลั๊กอินเพิ่ม
    authenticate: import('fastify').preHandlerHookHandler;
  }
}
