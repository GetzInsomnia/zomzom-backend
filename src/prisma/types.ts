export type Role = 'ADMIN' | 'EDITOR' | 'AGENT' | 'USER';

export type PropertyFlag =
  | 'NEGOTIABLE'
  | 'SPECIAL_PRICE'
  | 'NET_PRICE'
  | 'MEET_IN_PERSON'
  | 'NO_LIEN'
  | 'LIENED';

export type PropertyStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD';
export type PropertyType =
  | 'HOUSE'
  | 'TOWNHOME'
  | 'COMMERCIAL'
  | 'TWINHOUSE'
  | 'AFFORDABLE'
  | 'FLAT'
  | 'CONDO'
  | 'ROOM'
  | 'LAND'
  | 'COURSE'
  | 'FORM'
  | 'OTHER';
export type WorkflowState =
  | 'DRAFT'
  | 'REVIEW'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'HIDDEN'
  | 'ARCHIVED';

export interface Location {
  id: string;
  province: string;
  district: string | null;
  subdistrict: string | null;
  lat: number | null;
  lng: number | null;
}

export interface PropertyImageVariant {
  url: string;
}

export interface PropertyImage {
  id: string;
  propertyId: string;
  url: string;
  variants: Record<'webp' | 'avif', PropertyImageVariant> | null;
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
  furnished: boolean | null;
  locationId: string | null;
  reservedUntil: Date | null;
  deposit: boolean;
  workflowState: WorkflowState;
  workflowChangedAt: Date;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  hiddenAt: Date | null;
  isHidden: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  images: PropertyImage[];
  i18n: PropertyI18N[];
  flags: PropertyFlagOnProperty[];
  favorites: Favorite[];
  viewStats: ViewStat[];
  transitStations: PropertyTransitStation[];
  location: Location | null;
}

export interface PropertyFlagOnProperty {
  id: string;
  propertyId: string;
  flag: PropertyFlag;
  assignedAt: Date;
}

export interface Favorite {
  id: string;
  userId: string;
  propertyId: string;
  createdAt: Date;
}

export interface ViewStat {
  id: string;
  propertyId: string;
  bucket: Date;
  views: number;
}

export interface TransitStation {
  id: string;
  name: string;
  type: string;
  lat: number | null;
  lng: number | null;
}

export interface PropertyTransitStation {
  propertyId: string;
  stationId: string;
  distance: number | null;
}

export interface ArticleI18N {
  id: string;
  articleId: string;
  locale: string;
  title: string;
  body: string | null;
}

export interface Article {
  id: string;
  slug: string;
  workflowState: WorkflowState;
  workflowChangedAt: Date;
  published: boolean;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  hiddenAt: Date | null;
  deletedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
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
