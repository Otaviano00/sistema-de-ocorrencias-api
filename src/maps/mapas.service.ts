import { Injectable } from '@nestjs/common';
import { MapProvider } from './map.provider.js';
import type { Coordinates, MapLookupResult } from './maps.contract.js';

@Injectable()
export class MapasService {
  constructor(private readonly provider: MapProvider) {}

  async reverseGeocode(coordinates: Coordinates): Promise<MapLookupResult> {
    if (
      coordinates == null || !Number.isFinite(coordinates.latitude) || !Number.isFinite(coordinates.longitude) ||
      Math.abs(coordinates.latitude) > 90 || Math.abs(coordinates.longitude) > 180
    ) {
      return { success: false, code: 'INVALID_COORDINATES' };
    }
    return this.provider.reverseGeocode(coordinates);
  }
}
