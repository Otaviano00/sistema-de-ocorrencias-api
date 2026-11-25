import {Inject, Injectable, ServiceUnavailableException} from '@nestjs/common';
import {
  HttpClient,
  HttpClientError,
  HttpResponseError,
  InjectHttpClient,
} from '@nestjs/http-client';
import {MapProvider} from '../map.provider.js';
import type {
  Coordinates,
  MapLookupResult,
  NeighborhoodCandidate,
  RecognizedRegion,
} from '../maps.contract.js';

const REQUEST_INTERVAL_MS = 1100;
const DEFAULT_COOLDOWN_MS = 60_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() || null : null;
}

function isNotFound(value: unknown): boolean {
  return (
    isRecord(value) && text(value.error)?.toLowerCase() === 'unable to geocode'
  );
}

function validCoordinate(value: unknown, limit: number): boolean {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim()))
    return false;
  return Number.isFinite(Number(value)) && Math.abs(Number(value)) <= limit;
}

function neighborhood(
  address: Record<string, unknown>,
): NeighborhoodCandidate | null {
  const suburb = text(address.suburb);
  const nearby = text(address.neighbourhood);
  if (suburb && nearby && suburb.toLowerCase() !== nearby.toLowerCase())
    return null;
  if (suburb) return {name: suburb, sourceField: 'suburb'};
  return nearby ? {name: nearby, sourceField: 'neighbourhood'} : null;
}

function normalize(data: unknown, coordinates: Coordinates): MapLookupResult {
  if (isNotFound(data)) return {success: false, code: 'LOCATION_NOT_FOUND'};
  if (
    !isRecord(data) ||
    'error' in data ||
    !validCoordinate(data.lat, 90) ||
    !validCoordinate(data.lon, 180) ||
    (data.address !== undefined && !isRecord(data.address))
  ) {
    return {success: false, code: 'MAP_PROVIDER_UNAVAILABLE'};
  }
  const address = isRecord(data.address) ? data.address : {};
  return {
    success: true,
    location: {
      coordinates: {...coordinates},
      provider: 'nominatim',
      displayAddress: text(data.display_name),
      neighborhood: neighborhood(address),
      municipality:
        text(address.city) ??
        text(address.town) ??
        text(address.village) ??
        text(address.municipality),
      state: text(address.state),
      stateCode: text(address['ISO3166-2-lvl4']),
      countryCode: text(address.country_code)?.toLowerCase() ?? null,
    },
  };
}

@Injectable()
export class NominatimProvider extends MapProvider {
  private busy = false;
  private nextRequestAt = 0;

  constructor(
    @InjectHttpClient('nominatim') private readonly client: HttpClient,
    @Inject('NOMINATIM_SEARCH_URL') private readonly searchUrl: string,
  ) {
    super();
  }

  async searchRegions(query: string): Promise<RecognizedRegion[]> {
    if (this.busy || Date.now() < this.nextRequestAt) {
      throw new ServiceUnavailableException('API de mapas indisponível.');
    }
    this.busy = true;
    this.nextRequestAt = Date.now() + REQUEST_INTERVAL_MS;
    try {
      const url = new URL(this.searchUrl);
      url.pathname = '/search';
      const response = await this.client.get<unknown>(url.toString(), {
        responseType: 'json',
        query: {
          q: query,
          format: 'jsonv2',
          addressdetails: 1,
          'accept-language': 'pt-BR',
          countrycodes: 'br',
          limit: 8,
          featuretype: 'settlement',
        },
      });
      if (!Array.isArray(response.data)) return [];
      return response.data.flatMap(item => {
        if (!isRecord(item) || !isRecord(item.address)) return [];
        const name =
          text(item.address.suburb) ??
          text(item.address.neighbourhood) ??
          text(item.name);
        const providerId =
          typeof item.place_id === 'number' || typeof item.place_id === 'string'
            ? String(item.place_id)
            : null;
        if (!providerId || !name) return [];
        return [
          {
            providerId,
            name,
            municipality:
              text(item.address.city) ??
              text(item.address.town) ??
              text(item.address.municipality),
            state: text(item.address.state),
          },
        ];
      });
    } catch (error) {
      if (
        error instanceof HttpResponseError ||
        error instanceof HttpClientError
      ) {
        throw new ServiceUnavailableException('API de mapas indisponível.');
      }
      throw error;
    } finally {
      this.busy = false;
    }
  }

  async reverseGeocode(coordinates: Coordinates): Promise<MapLookupResult> {
    if (this.busy || Date.now() < this.nextRequestAt)
      return {success: false, code: 'MAP_PROVIDER_UNAVAILABLE'};
    this.busy = true;
    this.nextRequestAt = Date.now() + REQUEST_INTERVAL_MS;
    try {
      const response = await this.client.get<unknown>('', {
        responseType: 'json',
        query: {
          lat: coordinates.latitude,
          lon: coordinates.longitude,
          format: 'jsonv2',
          addressdetails: 1,
          'accept-language': 'pt-BR',
          zoom: 18,
          layer: 'address',
        },
      });
      return normalize(response.data, coordinates);
    } catch (error) {
      if (error instanceof HttpResponseError) {
        if (error.status === 404 && isNotFound(error.body)) {
          return {success: false, code: 'LOCATION_NOT_FOUND'};
        }
        if ([403, 429, 503].includes(error.status))
          this.applyCooldown(error.headers);
      }
      if (error instanceof HttpClientError)
        return {success: false, code: 'MAP_PROVIDER_UNAVAILABLE'};
      throw error;
    } finally {
      this.busy = false;
    }
  }

  private applyCooldown(headers: Headers): void {
    const retryAfter = headers.get('retry-after');
    const seconds = retryAfter === null ? NaN : Number(retryAfter);
    const deadline =
      Number.isFinite(seconds) && seconds >= 0
        ? Date.now() + seconds * 1000
        : Date.parse(retryAfter ?? '');
    this.nextRequestAt = Math.max(
      this.nextRequestAt,
      Date.now() + DEFAULT_COOLDOWN_MS,
      Number.isFinite(deadline) ? deadline : 0,
    );
  }
}
