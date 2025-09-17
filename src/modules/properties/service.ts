import { prisma } from '../../prisma/client';
import { createAuditLog } from '../../common/utils/audit';
import { httpError } from '../../common/utils/httpErrors';
import { IndexService } from '../index/service';
import { ProcessedImage } from '../uploads/service';
import { PaginatedResult, PropertyWithRelations } from './dto';
import { PropertyCreateInput, PropertyQueryInput, PropertyUpdateInput } from './schemas';

const STATUS_FIELD = 'status';
const TYPE_FIELD = 'type';

export class PropertyService {
  static async listProperties(filters: PropertyQueryInput): Promise<PaginatedResult<PropertyWithRelations>> {
    const page = Number(filters.page ?? 1);
    const pageSize = Number(filters.pageSize ?? 20);
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};

    if (filters.status) {
      where[STATUS_FIELD] = filters.status;
    }

    if (filters.type) {
      where[TYPE_FIELD] = filters.type;
    }

    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      where.price = {} as Record<string, number>;
      if (filters.priceMin !== undefined) {
        (where.price as Record<string, number>).gte = filters.priceMin;
      }
      if (filters.priceMax !== undefined) {
        (where.price as Record<string, number>).lte = filters.priceMax;
      }
    }

    if (filters.province) {
      where.location = {
        is: {
          province: {
            contains: filters.province,
            mode: 'insensitive'
          }
        }
      };
    }

    if (filters.beds !== undefined) {
      where.beds = { gte: filters.beds };
    }

    if (filters.baths !== undefined) {
      where.baths = { gte: filters.baths };
    }

    const [data, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          images: { orderBy: { order: 'asc' } },
          i18n: true,
          location: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }) as Promise<PropertyWithRelations[]>,
      prisma.property.count({ where })
    ]);

    const totalPages = Math.max(Math.ceil(total / pageSize), 1);

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages
      }
    };
  }

  static async getProperty(id: string): Promise<PropertyWithRelations> {
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        images: { orderBy: { order: 'asc' } },
        i18n: true,
        location: true
      }
    });

    if (!property) {
      throw httpError(404, 'Property not found');
    }

    return property as PropertyWithRelations;
  }

  static async createProperty(
    input: PropertyCreateInput,
    userId: string,
    options: { skipIndexRebuild?: boolean } = {}
  ): Promise<PropertyWithRelations> {
    const property = await prisma.$transaction(async (tx: any) => {
      let locationId = input.locationId ?? null;

      if (!locationId && input.location) {
        const location = await tx.location.create({
          data: {
            province: input.location.province,
            district: input.location.district ?? null,
            subdistrict: input.location.subdistrict ?? null,
            lat: input.location.lat ?? null,
            lng: input.location.lng ?? null
          }
        });
        locationId = location.id;
      }

      const created = await tx.property.create({
        data: {
          slug: input.slug,
          status: input.status ?? 'AVAILABLE',
          type: input.type,
          price: input.price,
          area: input.area ?? null,
          beds: input.beds ?? null,
          baths: input.baths ?? null,
          locationId,
          reservedUntil: input.reservedUntil ?? null,
          deposit: input.deposit ?? false,
          i18n: {
            create: input.i18n.map((entry) => ({
              locale: entry.locale,
              title: entry.title,
              description: entry.description ?? null,
              amenities: entry.amenities ?? null
            }))
          }
        },
        include: {
          images: { orderBy: { order: 'asc' } },
          i18n: true,
          location: true
        }
      });

      await createAuditLog(tx, {
        userId,
        action: 'property.create',
        entityType: 'Property',
        entityId: created.id,
        meta: { slug: created.slug }
      });

      return created as PropertyWithRelations;
    });

    if (!options.skipIndexRebuild) {
      await IndexService.rebuildSafe();
    }

    return property;
  }

  static async updateProperty(
    id: string,
    input: PropertyUpdateInput,
    userId: string,
    options: { skipIndexRebuild?: boolean } = {}
  ): Promise<PropertyWithRelations> {
    const property = await prisma.$transaction(async (tx: any) => {
      const existing = await tx.property.findUnique({
        where: { id }
      });

      if (!existing) {
        throw httpError(404, 'Property not found');
      }

      let locationId = input.locationId ?? existing.locationId ?? null;

      if (input.location) {
        if (existing.locationId) {
          const updatedLocation = await tx.location.update({
            where: { id: existing.locationId },
            data: {
              province: input.location.province,
              district: input.location.district ?? null,
              subdistrict: input.location.subdistrict ?? null,
              lat: input.location.lat ?? null,
              lng: input.location.lng ?? null
            }
          });
          locationId = updatedLocation.id;
        } else {
          const location = await tx.location.create({
            data: {
              province: input.location.province,
              district: input.location.district ?? null,
              subdistrict: input.location.subdistrict ?? null,
              lat: input.location.lat ?? null,
              lng: input.location.lng ?? null
            }
          });
          locationId = location.id;
        }
      }

      const updated = await tx.property.update({
        where: { id },
        data: {
          slug: input.slug ?? existing.slug,
          status: input.status ?? existing.status,
          type: input.type ?? existing.type,
          price: input.price ?? existing.price,
          area: input.area === undefined ? undefined : input.area,
          beds: input.beds === undefined ? undefined : input.beds,
          baths: input.baths === undefined ? undefined : input.baths,
          locationId,
          reservedUntil: input.reservedUntil === undefined ? undefined : input.reservedUntil,
          deposit: input.deposit === undefined ? undefined : input.deposit,
          i18n: input.i18n
            ? {
                deleteMany: { propertyId: id },
                create: input.i18n.map((entry) => ({
                  locale: entry.locale,
                  title: entry.title,
                  description: entry.description ?? null,
                  amenities: entry.amenities ?? null
                }))
              }
            : undefined
        },
        include: {
          images: { orderBy: { order: 'asc' } },
          i18n: true,
          location: true
        }
      });

      await createAuditLog(tx, {
        userId,
        action: 'property.update',
        entityType: 'Property',
        entityId: updated.id,
        meta: { slug: updated.slug }
      });

      return updated as PropertyWithRelations;
    });

    if (!options.skipIndexRebuild) {
      await IndexService.rebuildSafe();
    }

    return property;
  }

  static async addImages(propertyId: string, images: ProcessedImage[], userId: string, options: { skipIndexRebuild?: boolean } = {}) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      throw httpError(404, 'Property not found');
    }

    const createdImages = await prisma.$transaction(async (tx: any) => {
      const existingCount = await tx.propertyImage.count({ where: { propertyId } });
      const result = [] as { id: string; url: string; order: number }[];

      for (const [index, image] of images.entries()) {
        const created = await tx.propertyImage.create({
          data: {
            propertyId,
            url: image.url,
            order: existingCount + index
          }
        });
        result.push(created);
      }

      await createAuditLog(tx, {
        userId,
        action: 'property.image.add',
        entityType: 'Property',
        entityId: propertyId,
        meta: { count: images.length }
      });

      return result;
    });

    if (!options.skipIndexRebuild) {
      await IndexService.rebuildSafe();
    }

    return createdImages;
  }

  static async removeImage(propertyId: string, imageId: string, userId: string, options: { skipIndexRebuild?: boolean } = {}) {
    await prisma.$transaction(async (tx: any) => {
      const image = await tx.propertyImage.findFirst({
        where: { id: imageId, propertyId }
      });

      if (!image) {
        throw httpError(404, 'Image not found');
      }

      await tx.propertyImage.delete({ where: { id: imageId } });

      await createAuditLog(tx, {
        userId,
        action: 'property.image.delete',
        entityType: 'Property',
        entityId: propertyId,
        meta: { imageId }
      });
    });

    if (!options.skipIndexRebuild) {
      await IndexService.rebuildSafe();
    }
  }
}
