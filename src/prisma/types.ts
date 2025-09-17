export type Role = 'ADMIN' | 'EDITOR' | 'VIEWER';

export type PropertyStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD';
export type PropertyType = 'CONDO' | 'HOUSE' | 'LAND' | 'COMMERCIAL';

export interface Location {
  id: string;
  province: string;
  district: string | null;
  subdistrict: string | null;
  lat: number | null;
  lng: number | null;
}

export interface PropertyImage {
  id: string;
  propertyId: string;
  url: string;
  order: number;
}

export interface PropertyI18N {
  id: string;
  propertyId: string;
  locale: string;
  title: string;
  description: string | null;
  amenities: unknown | null;
}

export interface Property {
  id: string;
  slug: string;
  status: PropertyStatus;
  type: PropertyType;
  price: number;
  area: number | null;
  beds: number | null;
  baths: number | null;
  locationId: string | null;
  reservedUntil: Date | null;
  deposit: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  images: PropertyImage[];
  i18n: PropertyI18N[];
  location: Location | null;
}

export interface ArticleI18N {
  id: string;
  articleId: string;
  locale: string;
  title: string;
  body: unknown;
}

export interface Article {
  id: string;
  slug: string;
  published: boolean;
  updatedAt: Date;
  i18n: ArticleI18N[];
}

export interface ChangeSet {
  id: string;
  entityType: string;
  entityId: string | null;
  patch: unknown;
  status: string;
  scheduleAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
