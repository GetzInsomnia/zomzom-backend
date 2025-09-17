import { z } from 'zod';

export const scheduleCreateSchema = z.object({
  entityType: z.enum(['property', 'article']),
  entityId: z.string().min(1),
  patch: z.record(z.any()),
  runAt: z.coerce.date().optional()
});

export type ScheduleCreateInput = z.infer<typeof scheduleCreateSchema>;

export const scheduleJobsQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});
