import { FastifyInstance } from 'fastify';
import type { $Enums } from '@prisma/client';
import { roleGuard } from '../../common/middlewares/authGuard';
import { verifyCsrfToken } from '../../common/middlewares/csrf';
import { createAuditLog } from '../../common/utils/audit';
import { prisma } from '../../prisma/client';
import { IndexService } from './service';

export async function registerIndexRoutes(app: FastifyInstance) {
  app.post(
    '/v1/index/rebuild',
    {
      preHandler: [
        app.authenticate,
        roleGuard(['ADMIN'] as $Enums.Role[]),
        verifyCsrfToken
      ]
    },
    async (request) => {
      const summary = await IndexService.rebuild();
      await createAuditLog(prisma, {
        userId: request.user!.id,
        action: 'index.rebuild',
        entityType: 'SearchIndex',
        meta: summary,
        ipAddress: request.ip
      });
      return summary;
    }
  );
}
