import { Location, Property, PropertyImage, PropertyI18N } from '../../prisma/types';

export type PropertyWithRelations = Property & {
  images: PropertyImage[];
  i18n: PropertyI18N[];
  location: Location | null;
};

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
