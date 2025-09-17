import archiver from 'archiver';
import { existsSync } from 'fs';
import path from 'path';
import { FastifyReply } from 'fastify';
import { prisma } from '../../prisma/client';
import { env } from '../../env';
import { createAuditLog } from '../../common/utils/audit';

export class BackupService {
  static async streamBackup(reply: FastifyReply, userId: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Disposition', `attachment; filename=zomzom-backup-${timestamp}.zip`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (error) => {
      throw error;
    });

    archive.pipe(reply.raw);

    const [properties, articles, users, locations, rates, changeSets, publishJobs, auditLogs] = await Promise.all([
      prisma.property.findMany({
        include: {
          images: true,
          i18n: true,
          location: true
        }
      }),
      prisma.article.findMany({
        include: {
          i18n: true
        }
      }),
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      }),
      prisma.location.findMany(),
      prisma.rate.findMany(),
      prisma.changeSet.findMany(),
      prisma.publishJob.findMany(),
      prisma.auditLog.findMany({ take: 5000 })
    ]);

    archive.append(JSON.stringify(properties, null, 2), { name: 'data/properties.json' });
    archive.append(JSON.stringify(articles, null, 2), { name: 'data/articles.json' });
    archive.append(JSON.stringify(users, null, 2), { name: 'data/users.json' });
    archive.append(JSON.stringify(locations, null, 2), { name: 'data/locations.json' });
    archive.append(JSON.stringify(rates, null, 2), { name: 'data/rates.json' });
    archive.append(JSON.stringify(changeSets, null, 2), { name: 'data/changeSets.json' });
    archive.append(JSON.stringify(publishJobs, null, 2), { name: 'data/publishJobs.json' });
    archive.append(JSON.stringify(auditLogs, null, 2), { name: 'data/auditLogs.json' });

    const uploadDir = path.resolve(env.UPLOAD_DIR);
    if (existsSync(uploadDir)) {
      archive.directory(uploadDir, 'uploads');
    }

    await createAuditLog(prisma, {
      userId,
      action: 'backup.generate',
      entityType: 'Backup',
      meta: { timestamp }
    });

    await archive.finalize();
  }
}
