import { Injectable } from '@nestjs/common';
import { HttpClient, InjectHttpClient } from '@nestjs/http-client';
import { MapProvider } from '../map.provider.js';
import type { Coordinates, MapLookupResult } from '../maps.contract.js';

@Injectable()
export class NominatimProvider extends MapProvider {
  constructor(@InjectHttpClient('nominatim') private readonly client: HttpClient) {
    super();
  }

  async reverseGeocode(_coordinates: Coordinates): Promise<MapLookupResult> {
    return { success: false, code: 'MAP_PROVIDER_UNAVAILABLE' };
  }
}
