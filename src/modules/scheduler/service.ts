import { FastifyInstance } from 'fastify';
import { prisma } from '../../prisma/client';
import { createAuditLog } from '../../common/utils/audit';
import { propertyUpdateSchema } from '../properties/schemas';
import { articleUpdateSchema } from '../articles/schemas';
import { PropertyService } from '../properties/service';
import { ArticleService } from '../articles/service';
import { IndexService } from '../index/service';
import { ScheduleCreateInput } from './schemas';

const PROCESS_INTERVAL_MS = 60_000;

export class SchedulerService {
  private static interval: NodeJS.Timeout | null = null;
  private static processing = false;

  static start(app: FastifyInstance) {
    if (this.interval) {
      return;
    }

    const runner = async () => {
      if (this.processing) {
        return;
      }
      this.processing = true;
      try {
        const released = await this.releaseExpiredReservations();
        if (released > 0) {
          app.log.info({ released }, 'Released expired property reservations');
        }
        await this.processDueJobs(app);
      } finally {
        this.processing = false;
      }
    };

    this.interval = setInterval(runner, PROCESS_INTERVAL_MS);
    app.addHook('onClose', async () => {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }
    });

    runner().catch((error) => {
      app.log.error({ err: error }, 'Initial scheduler run failed');
    });
  }

  static async createSchedule(input: ScheduleCreateInput, userId: string, ipAddress?: string | null) {
    const runAt = input.runAt ?? new Date();
    const normalizedPatch = this.normalizePatch(input);

    return prisma.$transaction(async (tx: any) => {
      const changeSet = await tx.changeSet.create({
        data: {
          entityType: input.entityType,
          entityId: input.entityId,
          patch: normalizedPatch,
          status: 'pending',
          scheduleAt: runAt,
          createdBy: userId
        }
      });

      const job = await tx.publishJob.create({
        data: {
          changesetId: changeSet.id,
          runAt,
          status: 'queued'
        }
      });

      await createAuditLog(tx, {
        userId,
        action: 'schedule.create',
        entityType: input.entityType,
        entityId: input.entityId,
        meta: { changeSetId: changeSet.id, runAt },
        ipAddress: ipAddress ?? null
      });

      return { changeSet, job };
    });
  }

  static async listJobs(limit: number, status?: string) {
    return prisma.publishJob.findMany({
      where: status ? { status } : undefined,
      include: {
        changeSet: true
      },
      orderBy: { runAt: 'desc' },
      take: limit
    });
  }

  private static normalizePatch(input: ScheduleCreateInput) {
    if (input.entityType === 'property') {
      return propertyUpdateSchema.parse(input.patch);
    }

    if (input.entityType === 'article') {
      return articleUpdateSchema.parse(input.patch);
    }

    throw new Error(`Unsupported entity type: ${input.entityType}`);
  }

  private static async processDueJobs(app: FastifyInstance) {
    const jobs = await prisma.publishJob.findMany({
      where: {
        status: 'queued',
        runAt: {
          lte: new Date()
        }
      },
      include: {
        changeSet: true
      },
      orderBy: { runAt: 'asc' },
      take: 10
    });

    for (const job of jobs) {
      await prisma.publishJob.update({
        where: { id: job.id },
        data: { status: 'running' }
      });

      await prisma.changeSet.update({
        where: { id: job.changesetId },
        data: { status: 'processing' }
      });

      try {
        await this.applyChangeSet(job.changeSet);

        await prisma.changeSet.update({
          where: { id: job.changesetId },
          data: { status: 'applied' }
        });

        await prisma.publishJob.update({
          where: { id: job.id },
          data: { status: 'success', log: 'Applied successfully' }
        });

        await IndexService.rebuildSafe();
      } catch (error) {
        await prisma.changeSet.update({
          where: { id: job.changesetId },
          data: { status: 'failed' }
        }).catch(() => undefined);

        await prisma.publishJob.update({
          where: { id: job.id },
          data: { status: 'failed', log: (error as Error).message }
        });

        app.log.error({ err: error, jobId: job.id }, 'Failed to apply scheduled change');
      }
    }
  }

  private static async applyChangeSet(changeSet: any) {
    if (!changeSet?.entityId) {
      throw new Error('ChangeSet missing entityId');
    }

    if (changeSet.entityType === 'property') {
      const patch = propertyUpdateSchema.parse(changeSet.patch);
      await PropertyService.updateProperty(changeSet.entityId, patch, changeSet.createdBy, {
        skipIndexRebuild: true
      });
      return;
    }

    if (changeSet.entityType === 'article') {
      const patch = articleUpdateSchema.parse(changeSet.patch);
      await ArticleService.updateArticle(changeSet.entityId, patch, changeSet.createdBy, {
        skipIndexRebuild: true
      });
      return;
    }

    throw new Error(`Unsupported entity type: ${changeSet.entityType}`);
  }

  private static async releaseExpiredReservations() {
    const now = new Date();
    const expiredReservations = await prisma.property.findMany({
      where: {
        status: 'RESERVED',
        deposit: false,
        reservedUntil: {
          lt: now
        }
      },
      select: { id: true, slug: true }
    });

    if (expiredReservations.length === 0) {
      return 0;
    }

    await prisma.$transaction(async (tx: any) => {
      for (const property of expiredReservations) {
        await tx.property.update({
          where: { id: property.id },
          data: {
            status: 'AVAILABLE',
            reservedUntil: null
          }
        });

        await createAuditLog(tx, {
          userId: null,
          action: 'property.reservation.release',
          entityType: 'Property',
          entityId: property.id,
          meta: { slug: property.slug, reason: 'reservation expired' },
          ipAddress: null
        });
      }
    });

    await IndexService.rebuildSafe();

    return expiredReservations.length;
  }
}
