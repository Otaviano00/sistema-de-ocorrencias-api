import { Injectable } from '@nestjs/common';
import { HttpClient, HttpClientError, HttpResponseError, InjectHttpClient } from '@nestjs/http-client';
import { MapProvider } from '../map.provider.js';
import type { Coordinates, MapLookupResult } from '../maps.contract.js';

const REQUEST_INTERVAL_MS = 1100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() || null : null;
}

function isNotFound(value: unknown): boolean {
  return isRecord(value) && text(value.error)?.toLowerCase() === 'unable to geocode';
}

function validCoordinate(value: unknown, limit: number): boolean {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return false;
  return Number.isFinite(Number(value)) && Math.abs(Number(value)) <= limit;
}

@Injectable()
export class NominatimProvider extends MapProvider {
  private nextRequestAt = 0;

  constructor(@InjectHttpClient('nominatim') private readonly client: HttpClient) {
    super();
  }

  async reverseGeocode(coordinates: Coordinates): Promise<MapLookupResult> {
    if (Date.now() < this.nextRequestAt) return { success: false, code: 'MAP_PROVIDER_UNAVAILABLE' };
    this.nextRequestAt = Date.now() + REQUEST_INTERVAL_MS;
    try {
    const response = await this.client.get<unknown>('', {
      responseType: 'json',
      query: { lat: coordinates.latitude, lon: coordinates.longitude, format: 'jsonv2', addressdetails: 1, 'accept-language': 'pt-BR', zoom: 18, layer: 'address' },
    });
    if (isNotFound(response.data)) return { success: false, code: 'LOCATION_NOT_FOUND' };
    if (
      !isRecord(response.data) || 'error' in response.data ||
      !validCoordinate(response.data.lat, 90) || !validCoordinate(response.data.lon, 180) ||
      (response.data.address !== undefined && !isRecord(response.data.address))
    ) {
      return { success: false, code: 'MAP_PROVIDER_UNAVAILABLE' };
    }
    const address = isRecord(response.data.address) ? response.data.address : {};
    const suburb = text(address.suburb);
    const nearby = text(address.neighbourhood);
    const conflicting = suburb && nearby && suburb.toLowerCase() !== nearby.toLowerCase();
    return {
      success: true,
      location: {
        coordinates: { ...coordinates }, provider: 'nominatim', displayAddress: text(response.data.display_name),
        neighborhood: conflicting ? null : suburb ? { name: suburb, sourceField: 'suburb' } : nearby ? { name: nearby, sourceField: 'neighbourhood' } : null,
        municipality: text(address.city) ?? text(address.town) ?? text(address.village) ?? text(address.municipality),
        state: text(address.state), stateCode: text(address['ISO3166-2-lvl4']), countryCode: text(address.country_code)?.toLowerCase() ?? null,
      },
    };
    } catch (error) {
      if (error instanceof HttpResponseError && error.status === 404 && isNotFound(error.body)) {
        return { success: false, code: 'LOCATION_NOT_FOUND' };
      }
      if (error instanceof HttpClientError) return { success: false, code: 'MAP_PROVIDER_UNAVAILABLE' };
      throw error;
    }
  }
}
