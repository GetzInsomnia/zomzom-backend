import archiver, { Archiver } from 'archiver';
import { existsSync } from 'fs';
import { opendir, stat } from 'fs/promises';
import path from 'path';
import { FastifyReply } from 'fastify';
import type { Stats } from 'fs';
import { prisma } from '../../prisma/client';
import { env } from '../../env';
import { createAuditLog } from '../../common/utils/audit';

const DEV_DATABASE_CANDIDATES = [
  path.resolve('./prisma/dev.db'),
  path.resolve('./prisma/dev.sqlite'),
  path.resolve('./dev.db'),
];

// Only bundle uploads that have been touched in the last 30 days to keep the backup
// lightweight. The traversal is iterative so large directory trees do not exhaust memory.
const RECENT_UPLOAD_WINDOW_DAYS = 30;

type UploadAppendResult = {
  fileCount: number;
  totalBytes: number;
};

export class BackupService {
  static async streamBackup(reply: FastifyReply, userId: string, ipAddress?: string | null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Disposition', `attachment; filename=zomzom-backup-${timestamp}.zip`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (error) => {
      reply.log.error({ err: error }, 'Failed while streaming backup archive');
      throw error;
    });
    archive.on('warning', (warning) => {
      reply.log.warn({ warning }, 'Non-fatal issue while streaming backup archive');
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

    const devDbIncluded = await BackupService.appendDevDatabase(archive, reply);
    const indexIncluded = BackupService.appendIndexDirectory(archive);
    const uploadDir = path.resolve(env.UPLOAD_DIR);
    const uploadsIncluded = await BackupService.appendRecentUploads(archive, uploadDir, reply);

    await archive.finalize();

    await createAuditLog(prisma, {
      userId,
      action: 'backup.generate',
      entityType: 'Backup',
      meta: {
        timestamp,
        route: '/api/admin/backup',
        method: 'GET',
        devDatabaseIncluded: devDbIncluded,
        searchIndexIncluded: indexIncluded,
        recentUploads: uploadsIncluded,
        uploadRetentionDays: RECENT_UPLOAD_WINDOW_DAYS,
      },
      ipAddress: ipAddress ?? null
    });
  }

  private static appendIndexDirectory(archive: Archiver) {
    const indexDir = path.resolve(env.INDEX_DIR);
    if (!existsSync(indexDir)) {
      return false;
    }
    archive.directory(indexDir, 'data/index');
    return true;
  }

  private static async appendDevDatabase(archive: Archiver, reply: FastifyReply) {
    for (const candidate of DEV_DATABASE_CANDIDATES) {
      if (existsSync(candidate)) {
        archive.file(candidate, { name: path.posix.join('database', path.basename(candidate)) });
        return true;
      }
    }

    const databaseUrl = env.DATABASE_URL;
    if (databaseUrl.startsWith('file:')) {
      const filePath = databaseUrl.replace('file:', '');
      const resolved = path.resolve(filePath);
      if (existsSync(resolved)) {
        archive.file(resolved, { name: path.posix.join('database', path.basename(resolved)) });
        return true;
      }
      reply.log.warn({ resolved }, 'DATABASE_URL points to file storage but no file was found for backup');
    }

    return false;
  }

  // Walk the upload directory iteratively so we never hold the entire tree in memory.
  // Each qualifying file is streamed directly into the archive with its original stats.
  private static async appendRecentUploads(
    archive: Archiver,
    baseDir: string,
    reply: FastifyReply
  ): Promise<UploadAppendResult> {
    if (!existsSync(baseDir)) {
      return { fileCount: 0, totalBytes: 0 };
    }

    const cutoff = Date.now() - RECENT_UPLOAD_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const stack: Array<{ dirPath: string; relative: string }> = [{ dirPath: baseDir, relative: '' }];
    let fileCount = 0;
    let totalBytes = 0;

    while (stack.length > 0) {
      const current = stack.pop()!;
      let dirHandle;
      try {
        dirHandle = await opendir(current.dirPath);
      } catch (error) {
        reply.log.warn({ error, dirPath: current.dirPath }, 'Unable to open uploads directory while building backup');
        continue;
      }

      for await (const entry of dirHandle) {
        const absolutePath = path.join(current.dirPath, entry.name);
        const relativePath = path.posix.join(current.relative, entry.name);

        if (entry.isDirectory()) {
          stack.push({ dirPath: absolutePath, relative: relativePath });
          continue;
        }

        if (!entry.isFile()) {
          continue;
        }

        let fileStats: Stats;
        try {
          fileStats = await stat(absolutePath);
        } catch (error) {
          reply.log.warn({ error, absolutePath }, 'Unable to stat upload file while building backup');
          continue;
        }

        if (fileStats.mtimeMs < cutoff) {
          continue;
        }

        archive.file(absolutePath, {
          name: path.posix.join('uploads/recent', relativePath),
          stats: fileStats,
        });
        fileCount += 1;
        totalBytes += fileStats.size;
      }
    }

    return { fileCount, totalBytes };
  }
}
