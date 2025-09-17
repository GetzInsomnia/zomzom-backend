import { FastifyInstance } from 'fastify';
import { authenticate, roleGuard } from '../../common/middlewares/authGuard';
import {
  articleCreateSchema,
  articleIdParamSchema,
  articleSlugParamSchema,
  articleUpdateSchema
} from './schemas';
import { ArticleService } from './service';

export async function registerArticleRoutes(app: FastifyInstance) {
  app.get('/v1/articles/:slug', async (request) => {
    const params = articleSlugParamSchema.parse(request.params);
    const article = await ArticleService.getBySlug(params.slug);
    return article;
  });

  app.post(
    '/v1/articles',
    { preHandler: [authenticate, roleGuard(['ADMIN', 'EDITOR'])] },
    async (request, reply) => {
      const body = articleCreateSchema.parse(request.body);
      const article = await ArticleService.createArticle(body, request.user!.id);
      reply.code(201);
      return article;
    }
  );

  app.patch(
    '/v1/articles/:id',
    { preHandler: [authenticate, roleGuard(['ADMIN', 'EDITOR'])] },
    async (request) => {
      const params = articleIdParamSchema.parse(request.params);
      const body = articleUpdateSchema.parse(request.body);
      const article = await ArticleService.updateArticle(params.id, body, request.user!.id);
      return article;
    }
  );
}
