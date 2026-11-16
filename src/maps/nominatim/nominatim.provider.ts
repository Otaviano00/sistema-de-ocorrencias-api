import { Injectable } from '@nestjs/common';
import { HttpClient, InjectHttpClient } from '@nestjs/http-client';
import { MapProvider } from '../map.provider.js';
import type { Coordinates, MapLookupResult } from '../maps.contract.js';

@Injectable()
export class NominatimProvider extends MapProvider {
  constructor(@InjectHttpClient('nominatim') private readonly client: HttpClient) {
    super();
  }

  async reverseGeocode(coordinates: Coordinates): Promise<MapLookupResult> {
    const response = await this.client.get<{ display_name: string; address: Record<string, string> }>('', {
      responseType: 'json',
      query: { lat: coordinates.latitude, lon: coordinates.longitude, format: 'jsonv2', addressdetails: 1, 'accept-language': 'pt-BR', zoom: 18, layer: 'address' },
    });
    const address = response.data.address;
    return {
      success: true,
      location: {
        coordinates: { ...coordinates }, provider: 'nominatim', displayAddress: response.data.display_name,
        neighborhood: { name: address.suburb.trim(), sourceField: 'suburb' },
        municipality: address.city, state: address.state, stateCode: address['ISO3166-2-lvl4'], countryCode: address.country_code.toLowerCase(),
      },
    };
  }
}
