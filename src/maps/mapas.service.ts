import { Injectable } from '@nestjs/common';
import { MapProvider } from './map.provider.js';
import type { Coordinates, MapLookupResult } from './maps.contract.js';

@Injectable()
export class MapasService {
  constructor(private readonly provider: MapProvider) {}

  async reverseGeocode(coordinates: Coordinates): Promise<MapLookupResult> {
    return this.provider.reverseGeocode(coordinates);
  }
}
