import { z } from 'zod';

import { ZTransitLineId, ZTransitStationId } from './transit';

import {
  AMENITIES,
  FURNITURE_OPTIONS,
  PRICE_BINS,
  PROPERTY_STATUS,
  PROPERTY_TYPES,
  SECONDARY_TAGS
} from './filters';

export { AMENITIES, FURNITURE_OPTIONS, PRICE_BINS, PROPERTY_STATUS, PROPERTY_TYPES, SECONDARY_TAGS } from './filters';

type PriceBin = (typeof PRICE_BINS)[number];

export const ZPropertyType = z.enum(PROPERTY_TYPES);
export const ZPropertyStatus = z.enum(PROPERTY_STATUS);
export const ZFurniture = z.enum(FURNITURE_OPTIONS);
export const ZSecondaryTag = z.enum(SECONDARY_TAGS);
export const ZAmenity = z.enum(AMENITIES);
export const ZPriceRangeKey = z.enum(PRICE_BINS.map((bin) => bin.key) as [PriceBin['key'], ...PriceBin['key'][]]);

const FURNISHING_FILTERS = ['NONE', 'PARTIAL', 'FULL'] as const;

export const PROPERTY_ORDERING = ['UPDATED_DESC', 'PRICE_ASC', 'PRICE_DESC', 'VIEWS_DESC'] as const;

export const ZFurnishingFilter = z.enum(FURNISHING_FILTERS);
export const ZPropertyOrdering = z.enum(PROPERTY_ORDERING);

const propertyFilterFields = {
  q: z.string().trim().min(1).optional(),
  status: ZPropertyStatus.optional(),
  type: ZPropertyType.optional(),
  priceMin: z.coerce.number().int().nonnegative().optional(),
  priceMax: z.coerce.number().int().nonnegative().optional(),
  priceBin: ZPriceRangeKey.optional(),
  furnished: ZFurnishingFilter.optional(),
  tags: z.array(ZSecondaryTag).optional(),
  amenities: z.array(ZAmenity).optional(),
  nearTransitLine: ZTransitLineId.optional(),
  nearTransitStation: ZTransitStationId.optional(),
  orderBy: ZPropertyOrdering.optional()
} as const;

export const ZPropertyFiltersBase = z.object(propertyFilterFields);

const applyPropertyFilterRefinements = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((data, ctx) => {
    if (data.priceBin !== undefined && (data.priceMin !== undefined || data.priceMax !== undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cannot combine price bin with explicit min/max',
        path: ['priceBin']
      });
    }

    if (
      data.priceMin !== undefined &&
      data.priceMax !== undefined &&
      data.priceMin > data.priceMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'priceMin cannot be greater than priceMax',
        path: ['priceMin']
      });
    }
  });

export const ZPropertyFilters = applyPropertyFilterRefinements(ZPropertyFiltersBase);

export const withPropertyFilterRefinements = applyPropertyFilterRefinements;

export type PropertyFilters = z.infer<typeof ZPropertyFilters>;

export type PropertyOrdering = z.infer<typeof ZPropertyOrdering>;

export function resolvePriceRange(key: PriceBin['key']) {
  const bin = PRICE_BINS.find((candidate) => candidate.key === key);
  if (!bin) return undefined;

  const range: { min: number; max?: number } = { min: bin.min };
  if ('max' in bin) {
    range.max = bin.max;
  }
  return range;
}
