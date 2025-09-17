import { FastifyInstance } from 'fastify';
import { authenticate, roleGuard } from '../../common/middlewares/authGuard';
import { UploadService } from '../uploads/service';
import { PropertyService } from './service';
import {
  propertyCreateSchema,
  propertyIdParamSchema,
  propertyImageParamSchema,
  propertyQuerySchema,
  propertyUpdateSchema
} from './schemas';

export async function registerPropertyRoutes(app: FastifyInstance) {
  app.get('/v1/properties', async (request) => {
    const filters = propertyQuerySchema.parse(request.query);
    const result = await PropertyService.listProperties(filters);
    return result;
  });

  app.get('/v1/properties/:id', async (request) => {
    const params = propertyIdParamSchema.parse(request.params);
    const property = await PropertyService.getProperty(params.id);
    return property;
  });

  app.post(
    '/v1/properties',
    { preHandler: [authenticate, roleGuard(['ADMIN', 'EDITOR'])] },
    async (request, reply) => {
      const body = propertyCreateSchema.parse(request.body);
      const property = await PropertyService.createProperty(body, request.user!.id);
      reply.code(201);
      return property;
    }
  );

  app.patch(
    '/v1/properties/:id',
    { preHandler: [authenticate, roleGuard(['ADMIN', 'EDITOR'])] },
    async (request) => {
      const params = propertyIdParamSchema.parse(request.params);
      const body = propertyUpdateSchema.parse(request.body);
      const property = await PropertyService.updateProperty(params.id, body, request.user!.id);
      return property;
    }
  );

  app.post(
    '/v1/properties/:id/images',
    { preHandler: [authenticate, roleGuard(['ADMIN', 'EDITOR'])] },
    async (request, reply) => {
      const params = propertyIdParamSchema.parse(request.params);
      const files = await UploadService.parseImageRequest(request);
      const processed = await UploadService.processPropertyImages(params.id, files);
      const images = await PropertyService.addImages(params.id, processed, request.user!.id);
      reply.code(201);
      return { images };
    }
  );

  app.delete(
    '/v1/properties/:id/images/:imageId',
    { preHandler: [authenticate, roleGuard(['ADMIN', 'EDITOR'])] },
    async (request, reply) => {
      const params = propertyImageParamSchema.parse(request.params);
      await PropertyService.removeImage(params.id, params.imageId, request.user!.id);
      reply.code(204).send();
    }
  );
}
