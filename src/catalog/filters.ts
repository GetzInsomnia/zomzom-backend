export const PROPERTY_TYPES = [
  'HOUSE',
  'TOWNHOME',
  'COMMERCIAL',
  'TWINHOUSE',
  'AFFORDABLE',
  'FLAT',
  'CONDO',
  'ROOM',
  'LAND',
  'COURSE',
  'FORM',
  'OTHER'
] as const;

export const PROPERTY_STATUS = ['AVAILABLE', 'RESERVED', 'SOLD'] as const;

export const FURNITURE_OPTIONS = [
  'FURNISHED',
  'PARTIALLY_FURNISHED',
  'UNFURNISHED',
  'CUSTOM'
] as const;

export const PRICE_BINS = [
  { key: 'UNDER_5M', label: 'Under ฿5M', min: 0, max: 5_000_000 },
  { key: 'FROM_5M_TO_10M', label: '฿5M – ฿10M', min: 5_000_000, max: 10_000_000 },
  { key: 'FROM_10M_TO_20M', label: '฿10M – ฿20M', min: 10_000_000, max: 20_000_000 },
  { key: 'FROM_20M_TO_30M', label: '฿20M – ฿30M', min: 20_000_000, max: 30_000_000 },
  { key: 'FROM_30M_TO_50M', label: '฿30M – ฿50M', min: 30_000_000, max: 50_000_000 },
  { key: 'ABOVE_50M', label: '฿50M+', min: 50_000_000 }
] as const;

export const SECONDARY_TAGS = [
  'NEGOTIABLE',
  'SPECIAL_PRICE',
  'NET_PRICE',
  'MEET_IN_PERSON',
  'NO_LIEN',
  'LIENED'
] as const;

export const AMENITIES = [
  'backupPower',
  'beachfront',
  'butlerSuite',
  'cafe',
  'cafeteria',
  'cinema',
  'coldStorageReady',
  'concierge',
  'coworking',
  'elevator',
  'eventSpace',
  'farmland',
  'garden',
  'gym',
  'heritageFeatures',
  'highwayFrontage',
  'homeOffice',
  'irrigation',
  'library',
  'loadingDocks',
  'marina',
  'meditationSala',
  'meetingRooms',
  'officeWing',
  'outdoorKitchen',
  'parking',
  'playroom',
  'pool',
  'riverDeck',
  'riverfront',
  'roadAccess',
  'rooftop',
  'rooftopFarm',
  'seaView',
  'security',
  'skyDeck',
  'skyLounge',
  'smartHome',
  'solarPanels',
  'solarReady',
  'spa',
  'truckAccess',
  'utilities'
] as const;
