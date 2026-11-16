import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MapasService } from './mapas.service.js';
import type { Coordinates, MapLookupResult } from './maps.contract.js';

const coordinates = { latitude: -15.7939, longitude: -47.8828 };
const success: MapLookupResult = {
  success: true,
  location: {
    coordinates,
    provider: 'mock',
    displayAddress: null,
    neighborhood: null,
    municipality: 'Brasília',
    state: 'Distrito Federal',
    stateCode: 'BR-DF',
    countryCode: 'br',
  },
};

describe('MapasService', () => {
  let service: MapasService;
  const provider = { reverseGeocode: vi.fn() };

  beforeEach(() => {
    provider.reverseGeocode.mockReset().mockResolvedValue(success);
    service = new MapasService(provider);
  });

  afterEach(() => vi.restoreAllMocks());

  it('returns the provider result for the requested coordinates', async () => {
    await expect(service.reverseGeocode(coordinates)).resolves.toEqual(success);
    expect(provider.reverseGeocode).toHaveBeenCalledExactlyOnceWith(
      coordinates,
    );
  });

  it.each([
    { latitude: NaN, longitude: 0 },
    { latitude: 0, longitude: Infinity },
    { latitude: -91, longitude: 0 },
    { latitude: 91, longitude: 0 },
    { latitude: 0, longitude: -181 },
    { latitude: 0, longitude: 181 },
    { latitude: '0', longitude: 0 },
    {},
    null,
  ])(
    'rejects invalid coordinates without consulting the provider: %j',
    async (input) => {
      await expect(
        service.reverseGeocode(input as Coordinates),
      ).resolves.toEqual({ success: false, code: 'INVALID_COORDINATES' });
      expect(provider.reverseGeocode).not.toHaveBeenCalled();
    },
  );

  it.each([
    { latitude: 0, longitude: 0 },
    { latitude: -90, longitude: -180 },
    { latitude: 90, longitude: 180 },
  ])('accepts zero and inclusive boundaries: %j', async (input) => {
    await service.reverseGeocode(input);
    expect(provider.reverseGeocode).toHaveBeenCalledExactlyOnceWith(input);
  });

  it('reuses successful responses for identical coordinates', async () => {
    await service.reverseGeocode(coordinates);
    await expect(service.reverseGeocode(coordinates)).resolves.toEqual(success);
    expect(provider.reverseGeocode).toHaveBeenCalledTimes(1);
    await service.reverseGeocode({ ...coordinates, latitude: -15.7939001 });
    expect(provider.reverseGeocode).toHaveBeenCalledTimes(2);
  });

  it('refreshes a successful response after 24 hours', async () => {
    const start = 1_800_000_000_000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(start);
    await service.reverseGeocode(coordinates);
    clock.mockReturnValue(start + 24 * 60 * 60 * 1000 - 1);
    await service.reverseGeocode(coordinates);
    expect(provider.reverseGeocode).toHaveBeenCalledTimes(1);
    clock.mockReturnValue(start + 24 * 60 * 60 * 1000);
    await service.reverseGeocode(coordinates);
    expect(provider.reverseGeocode).toHaveBeenCalledTimes(2);
  });

  it('keeps at most 1000 cached responses, removing the oldest when full', async () => {
    for (let index = 0; index < 1001; index++) {
      await service.reverseGeocode({ latitude: 0, longitude: index / 1000 });
    }
    await service.reverseGeocode({ latitude: 0, longitude: 1 });
    expect(provider.reverseGeocode).toHaveBeenCalledTimes(1001);
    await service.reverseGeocode({ latitude: 0, longitude: 0 });
    expect(provider.reverseGeocode).toHaveBeenCalledTimes(1002);
  });

  it.each(['LOCATION_NOT_FOUND', 'MAP_PROVIDER_UNAVAILABLE'] as const)(
    'does not cache %s',
    async (code) => {
      provider.reverseGeocode.mockResolvedValue({ success: false, code });
      await service.reverseGeocode(coordinates);
      await service.reverseGeocode(coordinates);
      expect(provider.reverseGeocode).toHaveBeenCalledTimes(2);
    },
  );
});
