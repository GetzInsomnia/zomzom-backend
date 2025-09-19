import { z } from 'zod';

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

export const ZPropertyFilters = z.object({
  status: ZPropertyStatus.optional(),
  type: ZPropertyType.optional(),
  priceRange: ZPriceRangeKey.optional(),
  furniture: ZFurniture.optional(),
  secondaryTags: z.array(ZSecondaryTag).optional(),
  amenities: z.array(ZAmenity).optional()
});

export type PropertyFilters = z.infer<typeof ZPropertyFilters>;

export function resolvePriceRange(key: PriceBin['key']) {
  const bin = PRICE_BINS.find((candidate) => candidate.key === key);
  if (!bin) return undefined;

  const range: { min: number; max?: number } = { min: bin.min };
  if ('max' in bin) {
    range.max = bin.max;
  }
  return range;
}
