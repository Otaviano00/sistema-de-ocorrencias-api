import { Injectable } from '@nestjs/common';
import { HttpClient, InjectHttpClient } from '@nestjs/http-client';
import { MapProvider } from '../map.provider.js';
import type { Coordinates, MapLookupResult } from '../maps.contract.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() || null : null;
}

@Injectable()
export class NominatimProvider extends MapProvider {
  constructor(@InjectHttpClient('nominatim') private readonly client: HttpClient) {
    super();
  }

  async reverseGeocode(coordinates: Coordinates): Promise<MapLookupResult> {
    const response = await this.client.get<Record<string, unknown>>('', {
      responseType: 'json',
      query: { lat: coordinates.latitude, lon: coordinates.longitude, format: 'jsonv2', addressdetails: 1, 'accept-language': 'pt-BR', zoom: 18, layer: 'address' },
    });
    const address = isRecord(response.data.address) ? response.data.address : {};
    const suburb = text(address.suburb);
    const nearby = text(address.neighbourhood);
    return {
      success: true,
      location: {
        coordinates: { ...coordinates }, provider: 'nominatim', displayAddress: text(response.data.display_name),
        neighborhood: suburb ? { name: suburb, sourceField: 'suburb' } : nearby ? { name: nearby, sourceField: 'neighbourhood' } : null,
        municipality: text(address.city) ?? text(address.town) ?? text(address.village) ?? text(address.municipality),
        state: text(address.state), stateCode: text(address['ISO3166-2-lvl4']), countryCode: text(address.country_code)?.toLowerCase() ?? null,
      },
    };
  }
}
