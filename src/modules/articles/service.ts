import { Prisma, WorkflowState } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { createAuditLog } from '../../common/utils/audit';
import { httpError } from '../../common/utils/httpErrors';
import { isWithinRetention } from '../../common/utils/preview';
import { IndexService } from '../index/service';
import { ArticleCreateInput, ArticleUpdateInput } from './schemas';

type ArticleServiceOptions = {
  skipIndexRebuild?: boolean;
  ipAddress?: string | null;
};

type ArticleVisibilityOptions = { preview?: boolean };

const SOFT_DELETE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export class ArticleService {
  static async getBySlug(slug: string, options: ArticleVisibilityOptions = {}) {
    const where: Prisma.ArticleWhereInput = { slug };
    this.applyVisibilityFilters(where, options.preview);

    const article = await prisma.article.findFirst({
      where,
      include: {
        i18n: true
      }
    });

    if (!article) {
      throw httpError(404, 'Article not found');
    }

    return article;
  }

  static async createArticle(input: ArticleCreateInput, userId: string, options: ArticleServiceOptions = {}) {
    const workflowState = (input.workflowState as WorkflowState | undefined)
      ?? (input.published ? 'PUBLISHED' : 'DRAFT');
    const workflowData = this.buildWorkflowStateData(workflowState);

    const article = await prisma.$transaction(async (tx: any) => {
      const created = await tx.article.create({
        data: {
          slug: input.slug,
          ...workflowData,
          i18n: {
            create: input.i18n.map((entry) => ({
              locale: entry.locale,
              title: entry.title,
              body: entry.body
            }))
          }
        },
        include: {
          i18n: true
        }
      });

      await createAuditLog(tx, {
        userId,
        action: 'article.create',
        entityType: 'Article',
        entityId: created.id,
        meta: { slug: created.slug },
        ipAddress: options.ipAddress ?? null
      });

      return created;
    });

    if (!options.skipIndexRebuild) {
      await IndexService.rebuildSafe();
    }

    return article;
  }

  static async updateArticle(id: string, input: ArticleUpdateInput, userId: string, options: ArticleServiceOptions = {}) {
    const article = await prisma.$transaction(async (tx: any) => {
      const existing = await tx.article.findUnique({ where: { id } });
      if (!existing) {
        throw httpError(404, 'Article not found');
      }

      const workflowData =
        input.published !== undefined
          ? this.buildWorkflowStateData(input.published ? 'PUBLISHED' : 'DRAFT')
          : undefined;

      const updated = await tx.article.update({
        where: { id },
        data: {
          slug: input.slug ?? existing.slug,
          ...(workflowData ?? {}),
          i18n: input.i18n
            ? {
                deleteMany: { articleId: id },
                create: input.i18n.map((entry) => ({
                  locale: entry.locale,
                  title: entry.title,
                  body: entry.body
                }))
              }
            : undefined
        },
        include: {
          i18n: true
        }
      });

      await createAuditLog(tx, {
        userId,
        action: 'article.update',
        entityType: 'Article',
        entityId: id,
        meta: { slug: updated.slug },
        ipAddress: options.ipAddress ?? null
      });

      return updated;
    });

    if (!options.skipIndexRebuild) {
      await IndexService.rebuildSafe();
    }

    return article;
  }

  static async transitionState(
    id: string,
    target: WorkflowState,
    userId: string,
    options: { ipAddress?: string | null; scheduledAt?: Date | null } = {}
  ) {
    const article = await prisma.$transaction(async (tx: any) => {
      const existing = await tx.article.findUnique({ where: { id } });

      if (!existing) {
        throw httpError(404, 'Article not found');
      }

      const data = this.buildWorkflowStateData(target, { scheduledAt: options.scheduledAt });

      const updated = await tx.article.update({
        where: { id },
        data,
        include: {
          i18n: true
        }
      });

      await createAuditLog(tx, {
        userId,
        action: 'article.workflow.transition',
        entityType: 'Article',
        entityId: id,
        meta: {
          from: existing.workflowState,
          to: target,
          scheduledAt: options.scheduledAt ?? null
        },
        ipAddress: options.ipAddress ?? null
      });

      return updated;
    });

    await IndexService.rebuildSafe();

    return article;
  }

  static async softDelete(id: string, userId: string, options: { ipAddress?: string | null } = {}) {
    const deleted = await prisma.$transaction(async (tx: any) => {
      const existing = await tx.article.findUnique({ where: { id } });

      if (!existing) {
        throw httpError(404, 'Article not found');
      }

      await tx.article.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          workflowState: 'HIDDEN',
          workflowChangedAt: new Date(),
          hiddenAt: new Date(),
          scheduledAt: null
        }
      });

      await createAuditLog(tx, {
        userId,
        action: 'article.softDelete',
        entityType: 'Article',
        entityId: id,
        meta: { slug: existing.slug },
        ipAddress: options.ipAddress ?? null
      });

      return true;
    });

    if (deleted) {
      await IndexService.rebuildSafe();
    }
  }

  static async restore(id: string, userId: string, options: { ipAddress?: string | null } = {}) {
    const article = await prisma.$transaction(async (tx: any) => {
      const existing = await tx.article.findUnique({ where: { id } });

      if (!existing || !existing.deletedAt) {
        throw httpError(404, 'Article not found');
      }

      if (!isWithinRetention(existing.deletedAt, SOFT_DELETE_RETENTION_MS)) {
        throw httpError(410, 'Article can no longer be restored');
      }

      const restored = await tx.article.update({
        where: { id },
        data: {
          deletedAt: null,
          ...this.buildWorkflowStateData('DRAFT')
        },
        include: {
          i18n: true
        }
      });

      await createAuditLog(tx, {
        userId,
        action: 'article.restore',
        entityType: 'Article',
        entityId: id,
        meta: { slug: restored.slug },
        ipAddress: options.ipAddress ?? null
      });

      return restored;
    });

    await IndexService.rebuildSafe();

    return article;
  }

  private static buildWorkflowStateData(
    state: WorkflowState,
    options: { scheduledAt?: Date | null } = {}
  ) {
    const now = new Date();
    const data: Record<string, any> = {
      workflowState: state,
      workflowChangedAt: now
    };

    switch (state) {
      case 'PUBLISHED':
        data.publishedAt = now;
        data.scheduledAt = null;
        data.hiddenAt = null;
        break;
      case 'SCHEDULED':
        if (!options.scheduledAt) {
          throw httpError(400, 'scheduledAt is required for scheduled state');
        }
        data.scheduledAt = options.scheduledAt;
        data.hiddenAt = null;
        data.publishedAt = null;
        break;
      case 'HIDDEN':
        data.hiddenAt = now;
        data.scheduledAt = null;
        break;
      default:
        data.scheduledAt = null;
        data.hiddenAt = null;
        data.publishedAt = null;
        break;
    }

    return data;
  }

  private static applyVisibilityFilters(where: Prisma.ArticleWhereInput, preview?: boolean) {
    if (preview) {
      const retentionCutoff = new Date(Date.now() - SOFT_DELETE_RETENTION_MS);
      const existingAnd = Array.isArray(where.AND)
        ? where.AND
        : where.AND
          ? [where.AND]
          : [];
      where.AND = [
        ...existingAnd,
        {
          OR: [{ deletedAt: null }, { deletedAt: { gte: retentionCutoff } }]
        }
      ];
      return;
    }

    where.workflowState = 'PUBLISHED';
    where.deletedAt = null;
  }
}
