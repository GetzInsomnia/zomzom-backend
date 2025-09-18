import { FastifyInstance } from 'fastify';
import { authenticate, roleGuard } from '../../common/middlewares/authGuard';
import { BackupService } from './service';

export async function registerBackupRoutes(app: FastifyInstance) {
  app.get(
    '/api/admin/backup',
    { preHandler: [authenticate, roleGuard(['ADMIN'])] },
    async (request, reply) => {
      await BackupService.streamBackup(reply, request.user!.id, request.ip);
      return reply;
    }
  );
}
