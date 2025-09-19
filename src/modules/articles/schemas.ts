import { z } from 'zod';

const articleI18nSchema = z.object({
  locale: z.string().min(2),
  title: z.string().min(1),
  body: z.string().optional().nullable()
});

export const workflowStateEnum = z.enum(['DRAFT', 'REVIEW', 'SCHEDULED', 'PUBLISHED', 'HIDDEN', 'ARCHIVED']);

export const articleCreateSchema = z.object({
  slug: z.string().min(1),
  published: z.boolean().optional(),
  workflowState: workflowStateEnum.optional(),
  i18n: z.array(articleI18nSchema).min(1)
});

export const articleUpdateSchema = z
  .object({
    slug: z.string().min(1).optional(),
    published: z.boolean().optional(),
    i18n: z.array(articleI18nSchema).min(1).optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Update payload cannot be empty'
  });

export const articleScheduleTransitionSchema = z.object({
  scheduledAt: z.coerce.date()
});

export const articleIdParamSchema = z.object({
  id: z.string().min(1)
});

export const articleSlugParamSchema = z.object({
  slug: z.string().min(1)
});

export type ArticleCreateInput = z.infer<typeof articleCreateSchema>;
export type ArticleUpdateInput = z.infer<typeof articleUpdateSchema>;
export type ArticleScheduleTransitionInput = z.infer<typeof articleScheduleTransitionSchema>;
