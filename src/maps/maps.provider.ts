import type {
  Coordinates,
  MapLookupResult,
  RecognizedRegion,
} from './maps.contract.js';

export abstract class MapProvider {
  abstract reverseGeocode(coordinates: Coordinates): Promise<MapLookupResult>;
  abstract searchRegions(query: string): Promise<RecognizedRegion[]>;
}
