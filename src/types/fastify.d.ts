import 'fastify';
import type { Role } from '@prisma/client';

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

  interface FastifyInstance {
    // จะถูกเติมโดยปลั๊กอิน auth (ดูไฟล์ src/auth/jwt.ts ด้านล่าง)
    authenticate: (request: FastifyRequest, reply: import('fastify').FastifyReply) => Promise<void>;
  }
}
