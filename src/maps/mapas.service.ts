import { Injectable } from '@nestjs/common';
import { MapProvider } from './map.provider.js';
import type { Coordinates, MapLookupResult } from './maps.contract.js';

@Injectable()
export class MapasService {
  private readonly cache = new Map<string, MapLookupResult>();

  constructor(private readonly provider: MapProvider) {}

  async reverseGeocode(coordinates: Coordinates): Promise<MapLookupResult> {
    if (
      coordinates == null || !Number.isFinite(coordinates.latitude) || !Number.isFinite(coordinates.longitude) ||
      Math.abs(coordinates.latitude) > 90 || Math.abs(coordinates.longitude) > 180
    ) {
      return { success: false, code: 'INVALID_COORDINATES' };
    }
    const key = `${coordinates.latitude},${coordinates.longitude}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const result = await this.provider.reverseGeocode(coordinates);
    if (result.success) this.cache.set(key, result);
    return result;
  }
}
