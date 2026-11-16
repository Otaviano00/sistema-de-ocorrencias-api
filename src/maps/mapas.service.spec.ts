import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MapasService } from './mapas.service.js';
import type { MapLookupResult } from './maps.contract.js';

const coordinates = { latitude: -15.7939, longitude: -47.8828 };
const success: MapLookupResult = {
  success: true,
  location: {
    coordinates, provider: 'mock', displayAddress: null, neighborhood: null,
    municipality: 'Brasília', state: 'Distrito Federal', stateCode: 'BR-DF', countryCode: 'br',
  },
};

describe('MapasService', () => {
  let service: MapasService;
  const provider = { reverseGeocode: vi.fn() };

  beforeEach(() => {
    provider.reverseGeocode.mockReset().mockResolvedValue(success);
    service = new MapasService(provider);
  });

  it('returns the provider result for the requested coordinates', async () => {
    await expect(service.reverseGeocode(coordinates)).resolves.toEqual(success);
    expect(provider.reverseGeocode).toHaveBeenCalledExactlyOnceWith(coordinates);
  });
});
