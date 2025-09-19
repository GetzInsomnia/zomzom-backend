import { z } from 'zod';

export type TransitSystem = {
  id: string;
  name: string;
  shortName?: string;
};

export type TransitLine = {
  id: string;
  systemId: TransitSystem['id'];
  name: string;
  shortName?: string;
  color: string;
  openedYear?: number;
};

export type TransitStation = {
  id: string;
  lineId: TransitLine['id'];
  name: string;
  code?: string | null;
  lat?: number;
  lng?: number;
};

const transitLines = [
  {
    id: 'BTS_SUKHUMVIT',
    systemId: 'BTS',
    name: 'BTS Sukhumvit Line',
    shortName: 'Sukhumvit',
    color: '#6CC24A',
    openedYear: 1999,
  },
  {
    id: 'BTS_SILOM',
    systemId: 'BTS',
    name: 'BTS Silom Line',
    shortName: 'Silom',
    color: '#1A9DD9',
    openedYear: 1999,
  },
  {
    id: 'MRT_BLUE',
    systemId: 'MRT',
    name: 'MRT Blue Line',
    shortName: 'Blue',
    color: '#1F4DB5',
    openedYear: 2004,
  },
  {
    id: 'MRT_PURPLE',
    systemId: 'MRT',
    name: 'MRT Purple Line',
    shortName: 'Purple',
    color: '#5E4B8B',
    openedYear: 2016,
  },
  {
    id: 'ARL_CITY_LINE',
    systemId: 'ARL',
    name: 'Airport Rail Link',
    shortName: 'City Line',
    color: '#D71920',
    openedYear: 2010,
  },
] as const satisfies readonly TransitLine[];

export const TRANSIT_LINES = transitLines;

const transitStations = [
  {
    id: 'BTS_SUKHUMVIT_MO_CHIT',
    lineId: 'BTS_SUKHUMVIT',
    name: 'Mo Chit',
    code: 'N8',
    lat: 13.880081,
    lng: 100.554135,
  },
  {
    id: 'BTS_SUKHUMVIT_SIAM',
    lineId: 'BTS_SUKHUMVIT',
    name: 'Siam',
    code: 'CEN',
    lat: 13.74555,
    lng: 100.534666,
  },
  {
    id: 'BTS_SILOM_BANG_WA',
    lineId: 'BTS_SILOM',
    name: 'Bang Wa',
    code: 'S12',
    lat: 13.720588,
    lng: 100.45764,
  },
  {
    id: 'BTS_SILOM_SALA_DAENG',
    lineId: 'BTS_SILOM',
    name: 'Sala Daeng',
    code: 'S2',
    lat: 13.728579,
    lng: 100.534851,
  },
  {
    id: 'MRT_BLUE_HUA_LAMPHONG',
    lineId: 'MRT_BLUE',
    name: 'Hua Lamphong',
    code: 'BL28',
    lat: 13.737474,
    lng: 100.516372,
  },
  {
    id: 'MRT_BLUE_BANG_SUE',
    lineId: 'MRT_BLUE',
    name: 'Bang Sue',
    code: 'BL11',
    lat: 13.801319,
    lng: 100.53793,
  },
  {
    id: 'MRT_PURPLE_TAO_POON',
    lineId: 'MRT_PURPLE',
    name: 'Tao Poon',
    code: 'PP16',
    lat: 13.806056,
    lng: 100.530654,
  },
  {
    id: 'MRT_PURPLE_KHLONG_BANG_PHAI',
    lineId: 'MRT_PURPLE',
    name: 'Khlong Bang Phai',
    code: 'PP01',
    lat: 13.874894,
    lng: 100.408264,
  },
  {
    id: 'ARL_CITY_LINE_PHAYA_THAI',
    lineId: 'ARL_CITY_LINE',
    name: 'Phaya Thai',
    code: 'A7',
    lat: 13.756255,
    lng: 100.534609,
  },
  {
    id: 'ARL_CITY_LINE_SUVARNABHUMI',
    lineId: 'ARL_CITY_LINE',
    name: 'Suvarnabhumi',
    code: 'A1',
    lat: 13.690067,
    lng: 100.75068,
  },
] as const satisfies readonly TransitStation[];

export const TRANSIT_STATIONS = transitStations;

const transitLineIds = TRANSIT_LINES.map((line) => line.id) as [
  TransitLine['id'],
  ...TransitLine['id'][]
];

const transitStationIds = TRANSIT_STATIONS.map((station) => station.id) as [
  TransitStation['id'],
  ...TransitStation['id'][]
];

export const ZTransitLineId = z.enum(transitLineIds);
export const ZTransitStationId = z.enum(transitStationIds);

export type TransitLineId = (typeof TRANSIT_LINES)[number]['id'];
export type TransitStationId = (typeof TRANSIT_STATIONS)[number]['id'];
