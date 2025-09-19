import { FastifyInstance } from 'fastify';
import type { $Enums } from '@prisma/client';
import { roleGuard } from '../../common/middlewares/authGuard';
import { BackupService } from './service';

export async function registerBackupRoutes(app: FastifyInstance) {
  app.get(
    '/api/admin/backup',
    {
      preHandler: [
        app.authenticate,
        roleGuard(['ADMIN'] as $Enums.Role[])
      ]
    },
    async (request, reply) => {
      await BackupService.streamBackup(reply, request.user!.id, request.ip);
      return reply;
    }
  );
}
