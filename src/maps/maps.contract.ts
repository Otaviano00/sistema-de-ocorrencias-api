/** WGS84 coordinates captured by the browser; never replaced by provider coordinates. */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** A provider label is a candidate, not proof of an administrative boundary. */
export interface NeighborhoodCandidate {
  name: string;
  /** Original address field, e.g. suburb or neighbourhood. */
  sourceField: string;
}

export interface GeographicLocation {
  coordinates: Coordinates;
  provider: string;
  displayAddress: string | null;
  neighborhood: NeighborhoodCandidate | null;
  municipality: string | null;
  state: string | null;
  /** ISO 3166-2 code when supplied by the provider, e.g. BR-DF. */
  stateCode: string | null;
  /** Lowercase ISO 3166-1 alpha-2 code when supplied, e.g. br. */
  countryCode: string | null;
}

export type MapLookupErrorCode =
  'INVALID_COORDINATES' | 'LOCATION_NOT_FOUND' | 'MAP_PROVIDER_UNAVAILABLE';

/** Expected failures are explicit; partial addresses remain successful lookups. */
export type MapLookupResult =
  | { success: true; location: GeographicLocation }
  | { success: false; code: MapLookupErrorCode };
