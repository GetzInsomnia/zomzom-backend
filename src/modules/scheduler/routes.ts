import { FastifyInstance } from 'fastify';
import type { $Enums } from '@prisma/client';
import { roleGuard } from '../../common/middlewares/authGuard';
import { verifyCsrfToken } from '../../common/middlewares/csrf';
import { scheduleCreateSchema, scheduleJobsQuerySchema } from './schemas';
import { SchedulerService } from './service';

export async function registerSchedulerRoutes(app: FastifyInstance) {
  app.post(
    '/v1/schedule',
    {
      preHandler: [
        app.authenticate,
        roleGuard(['ADMIN'] as $Enums.Role[]),
        verifyCsrfToken
      ]
    },
    async (request, reply) => {
      const body = scheduleCreateSchema.parse(request.body);
      const result = await SchedulerService.createSchedule(body, request.user!.id, request.ip);
      reply.code(201);
      return result;
    }
  );

  app.get(
    '/v1/schedule/jobs',
    {
      preHandler: [
        app.authenticate,
        roleGuard(['ADMIN'] as $Enums.Role[])
      ]
    },
    async (request) => {
      const query = scheduleJobsQuerySchema.parse(request.query);
      const jobs = await SchedulerService.listJobs(query.limit, query.status);
      return { jobs };
    }
  );
}
