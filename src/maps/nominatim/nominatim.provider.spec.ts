import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpClientModule } from '@nestjs/http-client';
import { Test, type TestingModule } from '@nestjs/testing';
import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MapsModule } from '../maps.module.js';
import { MapasService } from '../mapas.service.js';

const endpoint = 'https://nominatim.test/reverse';
const coordinates = { latitude: -15.7939, longitude: -47.8828 };
const body = {
  lat: '-15.8', lon: '-47.9', display_name: 'Endereço de exemplo',
  address: { suburb: ' Bairro de exemplo ', city: 'Brasília', state: 'Distrito Federal', 'ISO3166-2-lvl4': 'BR-DF', country_code: 'BR' },
};
const server = setupServer();
const unavailable = { success: false, code: 'MAP_PROVIDER_UNAVAILABLE' };

describe('Nominatim integration', () => {
  let module: TestingModule;
  let service: MapasService;
  let now: number;

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterAll(() => server.close());
  beforeEach(async () => {
    now = 1_800_000_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), HttpClientModule.forRoot({ retry: 3 }), MapsModule],
      providers: [{ provide: 'consumer', useFactory: (maps: MapasService) => maps, inject: [MapasService] }],
    }).overrideProvider(ConfigService).useValue(new ConfigService({
      NOMINATIM_API_URL: endpoint, NOMINATIM_USER_AGENT: 'zelar-api-test/1.0',
    })).compile();
    await module.init();
    service = module.get<MapasService>('consumer');
  });
  afterEach(async () => {
    await module?.close();
    server.resetHandlers();
    vi.restoreAllMocks();
  });

  it('queries with identification and parameters, normalizing the result without replacing GPS', async () => {
    let requestedUrl: URL | undefined;
    let userAgent: string | null = null;
    server.use(http.get(endpoint, ({ request }) => {
      requestedUrl = new URL(request.url);
      userAgent = request.headers.get('user-agent');
      return HttpResponse.json(body);
    }));
    await expect(service.reverseGeocode(coordinates)).resolves.toEqual({
      success: true,
      location: {
        coordinates, provider: 'nominatim', displayAddress: body.display_name,
        neighborhood: { name: 'Bairro de exemplo', sourceField: 'suburb' },
        municipality: 'Brasília', state: 'Distrito Federal', stateCode: 'BR-DF', countryCode: 'br',
      },
    });
    expect(userAgent).toBe('zelar-api-test/1.0');
    expect(Object.fromEntries(requestedUrl!.searchParams)).toEqual({
      lat: '-15.7939', lon: '-47.8828', format: 'jsonv2', addressdetails: '1', 'accept-language': 'pt-BR', zoom: '18', layer: 'address',
    });
  });

  it.each([
    [{ lat: '0', lon: '0' }, { displayAddress: null, neighborhood: null, municipality: null, state: null, stateCode: null, countryCode: null }],
    [{ ...body, address: { neighbourhood: ' Vizinhança ', town: 'Cidade' } }, { neighborhood: { name: 'Vizinhança', sourceField: 'neighbourhood' }, municipality: 'Cidade' }],
    [{ ...body, address: { suburb: 123, city: ' ', village: 'Vila' } }, { neighborhood: null, municipality: 'Vila' }],
  ])('normalizes a partial address without inventing missing fields: %j', async (data, location) => {
    server.use(http.get(endpoint, () => HttpResponse.json(data)));
    await expect(service.reverseGeocode(coordinates)).resolves.toMatchObject({ success: true, location });
  });

  it.each([
    [{ suburb: 'A', neighbourhood: 'B' }, null],
    [{ suburb: ' Bairro ', neighbourhood: 'bairro' }, { name: 'Bairro', sourceField: 'suburb' }],
    [{ city_district: 'Distrito' }, null],
  ])('avoids accepting conflicting or district labels as a neighborhood: %j', async (address, neighborhood) => {
    server.use(http.get(endpoint, () => HttpResponse.json({ ...body, address })));
    await expect(service.reverseGeocode(coordinates)).resolves.toMatchObject({ success: true, location: { neighborhood } });
  });

  it.each([200, 404])('recognizes no coverage with HTTP %s', async (status) => {
    server.use(http.get(endpoint, () => HttpResponse.json({ error: 'Unable to geocode' }, { status })));
    await expect(service.reverseGeocode(coordinates)).resolves.toEqual({ success: false, code: 'LOCATION_NOT_FOUND' });
  });

  it.each([
    null, [], {}, { error: 'Unexpected error' },
    { lat: 'invalid', lon: '0' }, { lat: '91', lon: '0' }, { lat: '0', lon: '0', address: [] },
  ].map(data => ({ data })))('rejects malformed upstream responses: %j', async ({ data }) => {
    server.use(http.get(endpoint, () => HttpResponse.json(data)));
    await expect(service.reverseGeocode(coordinates)).resolves.toEqual({ success: false, code: 'MAP_PROVIDER_UNAVAILABLE' });
  });

  it.each([403, 429, 500, 503])('reports HTTP %s without automatic retries', async (status) => {
    let calls = 0;
    server.use(http.get(endpoint, () => {
      calls++;
      return HttpResponse.json({ error: 'Failed' }, { status });
    }));
    await expect(service.reverseGeocode(coordinates)).resolves.toEqual(unavailable);
    expect(calls).toBe(1);
  });

  it.each(['network', 'json'])('reports a %s failure as unavailability', async (failure) => {
    server.use(http.get(endpoint, () => failure === 'network'
      ? HttpResponse.error()
      : new HttpResponse('{broken', { headers: { 'Content-Type': 'application/json' } })));
    await expect(service.reverseGeocode(coordinates)).resolves.toEqual(unavailable);
  });

  it('applies the configured timeout to a slow response', async () => {
    server.use(http.get(endpoint, async () => {
      await delay(100);
      return HttpResponse.json(body);
    }));
    const isolated = await Test.createTestingModule({ imports: [ConfigModule, MapsModule] })
      .overrideProvider(ConfigService).useValue(new ConfigService({
        NOMINATIM_API_URL: endpoint, NOMINATIM_USER_AGENT: 'zelar-api-test/1.0', NOMINATIM_TIMEOUT_MS: 20,
      })).compile();
    try {
      await expect(isolated.get(MapasService).reverseGeocode(coordinates)).resolves.toEqual(unavailable);
    } finally {
      await isolated.close();
    }
  });
});
