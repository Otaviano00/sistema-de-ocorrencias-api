import {Injectable, NotFoundException} from '@nestjs/common';
import {HttpClient, InjectHttpClient} from '@nestjs/http-client';
import {MapProvider} from '../maps.provider.js';
import type {
  Coordinates,
  MapLookupResult,
  RecognizedRegion,
} from '../maps.contract.js';
import type {
  NominatimAddressDto,
  NominatimReverseDto,
  NominatimSearchDto,
  NominatimSearchItemDto,
} from './nominatim.dto.js';

function toRecognizedRegion(item: NominatimSearchItemDto): RecognizedRegion {
  return {
    providerId: String(item.place_id),
    name: item.address.suburb ?? item.address.neighbourhood ?? item.name ?? '',
    municipality:
      item.address.city ??
      item.address.town ??
      item.address.municipality ??
      null,
    state: item.address.state ?? null,
  };
}

function toMapLookupResult(
  item: NominatimReverseDto,
  coordinates: Coordinates,
): MapLookupResult {
  if (item.error) throw new NotFoundException('Localização não encontrada.');

  const address: NominatimAddressDto = item.address ?? {};
  return {
    success: true,
    location: {
      coordinates,
      provider: 'nominatim',
      displayAddress: item.display_name ?? null,
      neighborhood: address.suburb
        ? {name: address.suburb, sourceField: 'suburb'}
        : address.neighbourhood
          ? {name: address.neighbourhood, sourceField: 'neighbourhood'}
          : null,
      municipality:
        address.city ??
        address.town ??
        address.village ??
        address.municipality ??
        null,
      state: address.state ?? null,
      stateCode: address['ISO3166-2-lvl4'] ?? null,
      countryCode: address.country_code?.toLowerCase() ?? null,
    },
  };
}

@Injectable()
export class NominatimProvider extends MapProvider {
  constructor(
    @InjectHttpClient('nominatim') private readonly client: HttpClient,
  ) {
    super();
  }

  async searchRegions(query: string): Promise<RecognizedRegion[]> {
    const response = await this.client.get<NominatimSearchDto>('/search', {
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

    return response.data.map(toRecognizedRegion);
  }

  async reverseGeocode(coordinates: Coordinates): Promise<MapLookupResult> {
    const response = await this.client.get<NominatimReverseDto>('/reverse', {
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
    return toMapLookupResult(response.data, coordinates);
  }
}
