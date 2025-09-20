import { FastifyInstance } from 'fastify';
import type { $Enums } from '@prisma/client';
import { roleGuard } from '../../common/middlewares/authGuard';
import { verifyCsrfToken } from '../../common/middlewares/csrf';
import { resolvePreviewMode } from '../../common/utils/preview';
import {
  articleCreateSchema,
  articleIdParamSchema,
  articleSlugParamSchema,
  articleScheduleTransitionSchema,
  articleUpdateSchema
} from './schemas';
import { ArticleService } from './service';

export async function registerArticleRoutes(app: FastifyInstance) {
  app.get('/v1/articles/:slug', async (request) => {
    const params = articleSlugParamSchema.parse(request.params);
    const { preview } = await resolvePreviewMode(request);
    const article = await ArticleService.getBySlug(params.slug, { preview });
    return article;
  });

  app.post(
    '/v1/articles',
    {
      preHandler: [
        app.authenticate,
        roleGuard(['ADMIN', 'EDITOR'] as $Enums.Role[]),
        verifyCsrfToken
      ]
    },
    async (request, reply) => {
      const body = articleCreateSchema.parse(request.body);
      const article = await ArticleService.createArticle(body, request.user!.id, {
        ipAddress: request.ip
      });
      reply.code(201);
      return article;
    }
  );

  app.patch(
    '/v1/articles/:id',
    {
      preHandler: [
        app.authenticate,
        roleGuard(['ADMIN', 'EDITOR'] as $Enums.Role[]),
        verifyCsrfToken
      ]
    },
    async (request, reply) => {
      const params = articleIdParamSchema.parse(request.params);
      const body = articleUpdateSchema.parse(request.body);
      const article = await ArticleService.updateArticle(params.id, body, request.user!.id, {
        ipAddress: request.ip
      });
      return article;
    }
  );

  app.post(
    '/v1/admin/articles/:id/draft',
    {
      preHandler: [
        app.authenticate,
        roleGuard(['ADMIN', 'EDITOR'] as $Enums.Role[]),
        verifyCsrfToken
      ]
    },
    async (request, reply) => {
      const params = articleIdParamSchema.parse(request.params);
      const article = await ArticleService.transitionState(params.id, 'DRAFT', request.user!.id, {
        ipAddress: request.ip
      });
      return article;
    }
  );

  app.post(
    '/v1/admin/articles/:id/review',
    {
      preHandler: [
        app.authenticate,
        roleGuard(['ADMIN', 'EDITOR'] as $Enums.Role[]),
        verifyCsrfToken
      ]
    },
    async (request, reply) => {
      const params = articleIdParamSchema.parse(request.params);
      const article = await ArticleService.transitionState(params.id, 'REVIEW', request.user!.id, {
        ipAddress: request.ip
      });
      return article;
    }
  );

  app.post(
    '/v1/admin/articles/:id/schedule',
    {
      preHandler: [
        app.authenticate,
        roleGuard(['ADMIN', 'EDITOR'] as $Enums.Role[]),
        verifyCsrfToken
      ]
    },
    async (request, reply) => {
      const params = articleIdParamSchema.parse(request.params);
      const body = articleScheduleTransitionSchema.parse(request.body);
      const article = await ArticleService.transitionState(params.id, 'SCHEDULED', request.user!.id, {
        scheduledAt: body.scheduledAt,
        ipAddress: request.ip
      });
      return article;
    }
  );

  app.post(
    '/v1/admin/articles/:id/publish',
    {
      preHandler: [
        app.authenticate,
        roleGuard(['ADMIN', 'EDITOR'] as $Enums.Role[]),
        verifyCsrfToken
      ]
    },
    async (request, reply) => {
      const params = articleIdParamSchema.parse(request.params);
      const article = await ArticleService.transitionState(params.id, 'PUBLISHED', request.user!.id, {
        ipAddress: request.ip
      });
      return article;
    }
  );

  app.post(
    '/v1/admin/articles/:id/hide',
    {
      preHandler: [
        app.authenticate,
        roleGuard(['ADMIN', 'EDITOR'] as $Enums.Role[]),
        verifyCsrfToken
      ]
    },
    async (request, reply) => {
      const params = articleIdParamSchema.parse(request.params);
      const article = await ArticleService.transitionState(params.id, 'HIDDEN', request.user!.id, {
        ipAddress: request.ip
      });
      return article;
    }
  );

  app.delete(
    '/v1/admin/articles/:id',
    {
      preHandler: [
        app.authenticate,
        roleGuard(['ADMIN', 'EDITOR'] as $Enums.Role[]),
        verifyCsrfToken
      ]
    },
    async (request, reply) => {
      const params = articleIdParamSchema.parse(request.params);
      await ArticleService.softDelete(params.id, request.user!.id, {
        ipAddress: request.ip
      });
      reply.code(204).send();
    }
  );

  app.post(
    '/v1/admin/articles/:id/restore',
    {
      preHandler: [
        app.authenticate,
        roleGuard(['ADMIN', 'EDITOR'] as $Enums.Role[]),
        verifyCsrfToken
      ]
    },
    async (request, reply) => {
      const params = articleIdParamSchema.parse(request.params);
      const article = await ArticleService.restore(params.id, request.user!.id, {
        ipAddress: request.ip
      });
      return article;
    }
  );
}
