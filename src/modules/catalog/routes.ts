import { FastifyInstance } from 'fastify';

import {
  AMENITIES,
  FURNITURE_OPTIONS,
  PRICE_BINS,
  PROPERTY_STATUS,
  PROPERTY_TYPES,
  SECONDARY_TAGS,
} from '../../catalog/filters';
import { TRANSIT_LINES, TRANSIT_STATIONS } from '../../catalog/transit';

export async function registerCatalogRoutes(app: FastifyInstance) {
  app.get('/api/catalog/filters', async () => ({
    propertyTypes: PROPERTY_TYPES,
    propertyStatus: PROPERTY_STATUS,
    furnitureOptions: FURNITURE_OPTIONS,
    priceBins: PRICE_BINS,
    amenities: AMENITIES,
    secondaryTags: SECONDARY_TAGS,
  }));

  app.get('/api/catalog/transit', async () => ({
    lines: TRANSIT_LINES,
    stations: TRANSIT_STATIONS,
  }));
}
