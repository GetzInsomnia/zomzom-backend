import { Prisma, WorkflowState } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { createAuditLog } from '../../common/utils/audit';
import { httpError } from '../../common/utils/httpErrors';
import { isWithinRetention } from '../../common/utils/preview';
import { IndexService } from '../index/service';
import { ProcessedImage } from '../uploads/service';
import { PaginatedResult, PropertyWithRelations } from './dto';
import { PropertyCreateInput, PropertyQueryInput, PropertyUpdateInput } from './schemas';

const SOFT_DELETE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

type PropertyServiceOptions = { preview?: boolean };

export class PropertyService {
  static async listProperties(
    filters: PropertyQueryInput,
    options: PropertyServiceOptions = {}
  ): Promise<PaginatedResult<PropertyWithRelations>> {
    const page = Number(filters.page ?? 1);
    const pageSize = Number(filters.pageSize ?? 20);
    const skip = (page - 1) * pageSize;

    const where: Prisma.PropertyWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      const priceFilter: Prisma.IntFilter = {};
      if (filters.priceMin !== undefined) {
        priceFilter.gte = filters.priceMin;
      }
      if (filters.priceMax !== undefined) {
        priceFilter.lte = filters.priceMax;
      }
      where.price = priceFilter;
    }

    if (filters.province) {
      const provinceFilter: any = {
        contains: filters.province,
        mode: 'insensitive'
      };
      where.location = {
        is: {
          province: provinceFilter
        }
      };
    }

    if (filters.beds !== undefined) {
      where.beds = { gte: filters.beds };
    }

    if (filters.baths !== undefined) {
      where.baths = { gte: filters.baths };
    }

    this.applyVisibilityFilters(where, options.preview);

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

  static async getProperty(id: string, options: PropertyServiceOptions = {}): Promise<PropertyWithRelations> {
    const where: Prisma.PropertyWhereInput = { id };
    this.applyVisibilityFilters(where, options.preview);

    const property = await prisma.property.findFirst({
      where,
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
    options: { skipIndexRebuild?: boolean; ipAddress?: string | null } = {}
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

      const workflowState = (input.workflowState as WorkflowState | undefined) ?? 'PUBLISHED';
      const workflowData = this.buildWorkflowStateData(workflowState);

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
          ...workflowData,
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
        meta: { slug: created.slug },
        ipAddress: options.ipAddress ?? null
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
    options: { skipIndexRebuild?: boolean; ipAddress?: string | null } = {}
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
        meta: { slug: updated.slug },
        ipAddress: options.ipAddress ?? null
      });

      return updated as PropertyWithRelations;
    });

    if (!options.skipIndexRebuild) {
      await IndexService.rebuildSafe();
    }

    return property;
  }

  static async transitionState(
    id: string,
    target: WorkflowState,
    userId: string,
    options: { ipAddress?: string | null; scheduledAt?: Date | null } = {}
  ): Promise<PropertyWithRelations> {
    const property = await prisma.$transaction(async (tx: any) => {
      const existing = await tx.property.findUnique({ where: { id } });

      if (!existing) {
        throw httpError(404, 'Property not found');
      }

      const data = this.buildWorkflowStateData(target, { scheduledAt: options.scheduledAt });

      const updated = await tx.property.update({
        where: { id },
        data,
        include: {
          images: { orderBy: { order: 'asc' } },
          i18n: true,
          location: true
        }
      });

      await createAuditLog(tx, {
        userId,
        action: 'property.workflow.transition',
        entityType: 'Property',
        entityId: id,
        meta: {
          from: existing.workflowState,
          to: target,
          scheduledAt: options.scheduledAt ?? null
        },
        ipAddress: options.ipAddress ?? null
      });

      return updated as PropertyWithRelations;
    });

    await IndexService.rebuildSafe();

    return property;
  }

  static async softDelete(
    id: string,
    userId: string,
    options: { ipAddress?: string | null } = {}
  ): Promise<void> {
    const deleted = await prisma.$transaction(async (tx: any) => {
      const existing = await tx.property.findUnique({ where: { id } });

      if (!existing) {
        throw httpError(404, 'Property not found');
      }

      await tx.property.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          workflowState: 'HIDDEN',
          workflowChangedAt: new Date(),
          hiddenAt: new Date(),
          scheduledAt: null
        }
      });

      await createAuditLog(tx, {
        userId,
        action: 'property.softDelete',
        entityType: 'Property',
        entityId: id,
        meta: { slug: existing.slug },
        ipAddress: options.ipAddress ?? null
      });

      return true;
    });

    if (deleted) {
      await IndexService.rebuildSafe();
    }
  }

  static async restore(
    id: string,
    userId: string,
    options: { ipAddress?: string | null } = {}
  ): Promise<PropertyWithRelations> {
    const property = await prisma.$transaction(async (tx: any) => {
      const existing = await tx.property.findUnique({ where: { id } });

      if (!existing || !existing.deletedAt) {
        throw httpError(404, 'Property not found');
      }

      if (!isWithinRetention(existing.deletedAt, SOFT_DELETE_RETENTION_MS)) {
        throw httpError(410, 'Property can no longer be restored');
      }

      const restored = await tx.property.update({
        where: { id },
        data: {
          deletedAt: null,
          ...this.buildWorkflowStateData('DRAFT')
        },
        include: {
          images: { orderBy: { order: 'asc' } },
          i18n: true,
          location: true
        }
      });

      await createAuditLog(tx, {
        userId,
        action: 'property.restore',
        entityType: 'Property',
        entityId: id,
        meta: { slug: restored.slug },
        ipAddress: options.ipAddress ?? null
      });

      return restored as PropertyWithRelations;
    });

    await IndexService.rebuildSafe();

    return property;
  }

  static async addImages(
    propertyId: string,
    images: ProcessedImage[],
    userId: string,
    options: { skipIndexRebuild?: boolean; ipAddress?: string | null } = {}
  ) {
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
        meta: { count: images.length },
        ipAddress: options.ipAddress ?? null
      });

      return result;
    });

    if (!options.skipIndexRebuild) {
      await IndexService.rebuildSafe();
    }

    return createdImages;
  }

  static async removeImage(
    propertyId: string,
    imageId: string,
    userId: string,
    options: { skipIndexRebuild?: boolean; ipAddress?: string | null } = {}
  ) {
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
        meta: { imageId },
        ipAddress: options.ipAddress ?? null
      });
    });

    if (!options.skipIndexRebuild) {
      await IndexService.rebuildSafe();
    }
  }

  private static buildWorkflowStateData(
    state: WorkflowState,
    options: { scheduledAt?: Date | null } = {}
  ) {
    const now = new Date();
    const data: Record<string, any> = {
      workflowState: state,
      workflowChangedAt: now
    };

    switch (state) {
      case 'PUBLISHED':
        data.publishedAt = now;
        data.scheduledAt = null;
        data.hiddenAt = null;
        break;
      case 'SCHEDULED':
        if (!options.scheduledAt) {
          throw httpError(400, 'scheduledAt is required for scheduled state');
        }
        data.scheduledAt = options.scheduledAt;
        data.hiddenAt = null;
        data.publishedAt = null;
        break;
      case 'HIDDEN':
        data.hiddenAt = now;
        data.scheduledAt = null;
        break;
      default:
        data.scheduledAt = null;
        data.hiddenAt = null;
        data.publishedAt = null;
        break;
    }

    return data;
  }

  private static applyVisibilityFilters(where: Prisma.PropertyWhereInput, preview?: boolean) {
    if (preview) {
      const retentionCutoff = new Date(Date.now() - SOFT_DELETE_RETENTION_MS);
      const existingAnd = Array.isArray(where.AND)
        ? where.AND
        : where.AND
          ? [where.AND]
          : [];
      where.AND = [
        ...existingAnd,
        {
          OR: [{ deletedAt: null }, { deletedAt: { gte: retentionCutoff } }]
        }
      ];
      return;
    }

    where.workflowState = 'PUBLISHED';
    where.deletedAt = null;
  }
}
