import { z } from 'zod';

const locationSchema = z.object({
  province: z.string().min(1),
  district: z.string().optional(),
  subdistrict: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional()
});

const propertyI18nSchema = z.object({
  locale: z.string().min(2),
  title: z.string().min(1),
  description: z.string().optional(),
  amenities: z.record(z.any()).optional()
});

const statusEnum = z.enum(['AVAILABLE', 'RESERVED', 'SOLD']);
const typeEnum = z.enum(['CONDO', 'HOUSE', 'LAND', 'COMMERCIAL']);
export const workflowStateEnum = z.enum(['DRAFT', 'REVIEW', 'SCHEDULED', 'PUBLISHED', 'HIDDEN']);

const nullablePositive = z.union([z.number().positive(), z.null()]);
const nullableInt = z.union([z.number().int().nonnegative(), z.null()]);

export const propertyCreateSchema = z
  .object({
    slug: z.string().min(1),
    status: statusEnum.optional(),
    type: typeEnum,
    price: z.number().int().nonnegative(),
    area: nullablePositive.optional(),
    beds: nullableInt.optional(),
    baths: nullableInt.optional(),
    locationId: z.string().optional(),
    location: locationSchema.optional(),
    reservedUntil: z.union([z.coerce.date(), z.null()]).optional(),
    deposit: z.boolean().optional(),
    workflowState: workflowStateEnum.optional(),
    i18n: z.array(propertyI18nSchema).min(1)
  })
  .refine((data) => !(data.location && data.locationId), {
    message: 'Provide either locationId or location details',
    path: ['location']
  });

export const propertyUpdateSchema = z
  .object({
    slug: z.string().min(1).optional(),
    status: statusEnum.optional(),
    type: typeEnum.optional(),
    price: z.number().int().nonnegative().optional(),
    area: nullablePositive.optional(),
    beds: nullableInt.optional(),
    baths: nullableInt.optional(),
    locationId: z.string().optional(),
    location: locationSchema.optional(),
    reservedUntil: z.union([z.coerce.date(), z.null()]).optional(),
    deposit: z.boolean().optional(),
    i18n: z.array(propertyI18nSchema).min(1).optional()
  })
  .refine((data) => !(data.location && data.locationId), {
    message: 'Provide either locationId or location details',
    path: ['location']
  });

export const propertyIdParamSchema = z.object({
  id: z.string().min(1)
});

export const propertyImageParamSchema = propertyIdParamSchema.extend({
  imageId: z.string().min(1)
});

export const propertyQuerySchema = z.object({
  status: statusEnum.optional(),
  type: typeEnum.optional(),
  priceMin: z.coerce.number().int().nonnegative().optional(),
  priceMax: z.coerce.number().int().nonnegative().optional(),
  province: z.string().optional(),
  beds: z.coerce.number().int().nonnegative().optional(),
  baths: z.coerce.number().int().nonnegative().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const propertyScheduleTransitionSchema = z.object({
  scheduledAt: z.coerce.date()
});

export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>;
export type PropertyUpdateInput = z.infer<typeof propertyUpdateSchema>;
export type PropertyQueryInput = z.infer<typeof propertyQuerySchema>;
export type PropertyScheduleTransitionInput = z.infer<typeof propertyScheduleTransitionSchema>;
