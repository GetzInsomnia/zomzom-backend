import { FastifyInstance } from 'fastify';
import { authenticate, roleGuard } from '../../common/middlewares/authGuard';
import { verifyCsrfToken } from '../../common/middlewares/csrf';
import { resolvePreviewMode } from '../../common/utils/preview';
import {
  PropertyFilters,
  ZPropertyFiltersBase,
  withPropertyFilterRefinements
} from '../../catalog/filters.schema';
import { z } from 'zod';
import { UploadService } from '../uploads/service';
import { PropertyService } from './service';
import {
  propertyCreateSchema,
  propertyIdParamSchema,
  propertyImageParamSchema,
  propertyScheduleTransitionSchema,
  propertyUpdateSchema
} from './schemas';

const ZPropertyListQuery = withPropertyFilterRefinements(
  ZPropertyFiltersBase.extend({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20)
  })
);

export async function registerPropertyRoutes(app: FastifyInstance) {
  app.get('/v1/properties', async (request) => {
    const parsed = ZPropertyListQuery.parse(request.query);
    const { page, pageSize, ...rawFilters } = parsed;
    const filters = rawFilters as PropertyFilters;
    const { preview } = await resolvePreviewMode(request);
    const result = await PropertyService.listProperties(filters, {
      preview,
      pagination: { page, pageSize }
    });
    return result;
  });

  app.get('/v1/properties/:id', async (request) => {
    const params = propertyIdParamSchema.parse(request.params);
    const { preview } = await resolvePreviewMode(request);
    const property = await PropertyService.getProperty(params.id, { preview });
    return property;
  });

  app.post(
    '/v1/properties',
    { preHandler: [authenticate, roleGuard(['ADMIN', 'EDITOR']), verifyCsrfToken] },
    async (request, reply) => {
      const body = propertyCreateSchema.parse(request.body);
      const property = await PropertyService.createProperty(body, request.user!.id, {
        ipAddress: request.ip
      });
      reply.code(201);
      return property;
    }
  );

  app.patch(
    '/v1/properties/:id',
    { preHandler: [authenticate, roleGuard(['ADMIN', 'EDITOR']), verifyCsrfToken] },
    async (request) => {
      const params = propertyIdParamSchema.parse(request.params);
      const body = propertyUpdateSchema.parse(request.body);
      const property = await PropertyService.updateProperty(params.id, body, request.user!.id, {
        ipAddress: request.ip
      });
      return property;
    }
  );

  app.post(
    '/v1/properties/:id/images',
    { preHandler: [authenticate, roleGuard(['ADMIN', 'EDITOR']), verifyCsrfToken] },
    async (request, reply) => {
      const params = propertyIdParamSchema.parse(request.params);
      const files = await UploadService.parseImageRequest(request);
      const processed = await UploadService.processPropertyImages(params.id, files);
      const images = await PropertyService.addImages(params.id, processed, request.user!.id, {
        ipAddress: request.ip
      });
      reply.code(201);
      return { images };
    }
  );

  app.delete(
    '/v1/properties/:id/images/:imageId',
    { preHandler: [authenticate, roleGuard(['ADMIN', 'EDITOR']), verifyCsrfToken] },
    async (request, reply) => {
      const params = propertyImageParamSchema.parse(request.params);
      await PropertyService.removeImage(params.id, params.imageId, request.user!.id, {
        ipAddress: request.ip
      });
      reply.code(204).send();
    }
  );

  app.post(
    '/v1/admin/properties/:id/draft',
    { preHandler: [authenticate, roleGuard(['ADMIN', 'EDITOR']), verifyCsrfToken] },
    async (request) => {
      const params = propertyIdParamSchema.parse(request.params);
      const property = await PropertyService.transitionState(params.id, 'DRAFT', request.user!.id, {
        ipAddress: request.ip
      });
      return property;
    }
  );

  app.post(
    '/v1/admin/properties/:id/review',
    { preHandler: [authenticate, roleGuard(['ADMIN', 'EDITOR']), verifyCsrfToken] },
    async (request) => {
      const params = propertyIdParamSchema.parse(request.params);
      const property = await PropertyService.transitionState(params.id, 'REVIEW', request.user!.id, {
        ipAddress: request.ip
      });
      return property;
    }
  );

  app.post(
    '/v1/admin/properties/:id/schedule',
    { preHandler: [authenticate, roleGuard(['ADMIN', 'EDITOR']), verifyCsrfToken] },
    async (request) => {
      const params = propertyIdParamSchema.parse(request.params);
      const body = propertyScheduleTransitionSchema.parse(request.body);
      const property = await PropertyService.transitionState(params.id, 'SCHEDULED', request.user!.id, {
        scheduledAt: body.scheduledAt,
        ipAddress: request.ip
      });
      return property;
    }
  );

  app.post(
    '/v1/admin/properties/:id/publish',
    { preHandler: [authenticate, roleGuard(['ADMIN', 'EDITOR']), verifyCsrfToken] },
    async (request) => {
      const params = propertyIdParamSchema.parse(request.params);
      const property = await PropertyService.transitionState(params.id, 'PUBLISHED', request.user!.id, {
        ipAddress: request.ip
      });
      return property;
    }
  );

  app.post(
    '/v1/admin/properties/:id/hide',
    { preHandler: [authenticate, roleGuard(['ADMIN', 'EDITOR']), verifyCsrfToken] },
    async (request) => {
      const params = propertyIdParamSchema.parse(request.params);
      const property = await PropertyService.transitionState(params.id, 'HIDDEN', request.user!.id, {
        ipAddress: request.ip
      });
      return property;
    }
  );

  app.delete(
    '/v1/admin/properties/:id',
    { preHandler: [authenticate, roleGuard(['ADMIN', 'EDITOR']), verifyCsrfToken] },
    async (request, reply) => {
      const params = propertyIdParamSchema.parse(request.params);
      await PropertyService.softDelete(params.id, request.user!.id, {
        ipAddress: request.ip
      });
      reply.code(204).send();
    }
  );

  app.post(
    '/v1/admin/properties/:id/restore',
    { preHandler: [authenticate, roleGuard(['ADMIN', 'EDITOR']), verifyCsrfToken] },
    async (request) => {
      const params = propertyIdParamSchema.parse(request.params);
      const property = await PropertyService.restore(params.id, request.user!.id, {
        ipAddress: request.ip
      });
      return property;
    }
  );
}
