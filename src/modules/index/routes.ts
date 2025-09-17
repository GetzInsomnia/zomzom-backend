import { FastifyInstance } from 'fastify';
import { authenticate, roleGuard } from '../../common/middlewares/authGuard';
import { createAuditLog } from '../../common/utils/audit';
import { prisma } from '../../prisma/client';
import { IndexService } from './service';

export async function registerIndexRoutes(app: FastifyInstance) {
  app.post(
    '/v1/index/rebuild',
    { preHandler: [authenticate, roleGuard(['ADMIN'])] },
    async (request) => {
      const summary = await IndexService.rebuild();
      await createAuditLog(prisma, {
        userId: request.user!.id,
        action: 'index.rebuild',
        entityType: 'SearchIndex',
        meta: summary
      });
      return summary;
    }
  );
}
