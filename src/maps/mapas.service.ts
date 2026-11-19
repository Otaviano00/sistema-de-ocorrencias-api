import {Injectable} from '@nestjs/common';
import {MapProvider} from './map.provider.js';
import type {Coordinates, MapLookupResult} from './maps.contract.js';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 1000;

@Injectable()
export class MapasService {
  private readonly cache = new Map<
    string,
    {result: MapLookupResult; expiresAt: number}
  >();

  constructor(private readonly provider: MapProvider) {}

  async reverseGeocode(coordinates: Coordinates): Promise<MapLookupResult> {
    if (
      coordinates === null ||
      !Number.isFinite(coordinates.latitude) ||
      !Number.isFinite(coordinates.longitude) ||
      Math.abs(coordinates.latitude) > 90 ||
      Math.abs(coordinates.longitude) > 180
    ) {
      return {success: false, code: 'INVALID_COORDINATES'};
    }
    const key = `${coordinates.latitude},${coordinates.longitude}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.result;
    this.cache.delete(key);
    const result = await this.provider.reverseGeocode(coordinates);
    if (result.success) {
      if (this.cache.size >= CACHE_MAX_ENTRIES) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey !== undefined) this.cache.delete(oldestKey);
      }
      this.cache.set(key, {result, expiresAt: Date.now() + CACHE_TTL_MS});
    }
    return result;
  }
}
