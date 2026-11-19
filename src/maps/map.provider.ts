import type {Coordinates, MapLookupResult} from './maps.contract.js';

export abstract class MapProvider {
  abstract reverseGeocode(coordinates: Coordinates): Promise<MapLookupResult>;
}
