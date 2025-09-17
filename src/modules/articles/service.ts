import { prisma } from '../../prisma/client';
import { createAuditLog } from '../../common/utils/audit';
import { httpError } from '../../common/utils/httpErrors';
import { IndexService } from '../index/service';
import { ArticleCreateInput, ArticleUpdateInput } from './schemas';

type ArticleServiceOptions = {
  skipIndexRebuild?: boolean;
};

export class ArticleService {
  static async getBySlug(slug: string) {
    const article = await prisma.article.findUnique({
      where: { slug },
      include: {
        i18n: true
      }
    });

    if (!article || !article.published) {
      throw httpError(404, 'Article not found');
    }

    return article;
  }

  static async createArticle(input: ArticleCreateInput, userId: string, options: ArticleServiceOptions = {}) {
    const article = await prisma.$transaction(async (tx: any) => {
      const created = await tx.article.create({
        data: {
          slug: input.slug,
          published: input.published ?? false,
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
        meta: { slug: created.slug }
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

      const updated = await tx.article.update({
        where: { id },
        data: {
          slug: input.slug ?? existing.slug,
          published: input.published ?? existing.published,
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
        meta: { slug: updated.slug }
      });

      return updated;
    });

    if (!options.skipIndexRebuild) {
      await IndexService.rebuildSafe();
    }

    return article;
  }
}
