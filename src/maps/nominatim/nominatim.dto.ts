export interface NominatimAddressDto {
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  country_code?: string;
  'ISO3166-2-lvl4'?: string;
}

export interface NominatimReverseDto {
  lat: string;
  lon: string;
  display_name?: string;
  address?: NominatimAddressDto;
  error?: string;
}

export interface NominatimSearchItemDto {
  place_id: number;
  name?: string;
  address: NominatimAddressDto;
}

export type NominatimSearchDto = NominatimSearchItemDto[];
