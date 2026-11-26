import {ConfigModule, ConfigService} from '@nestjs/config';
import {HttpClientModule} from '@nestjs/http-client';
import {Test, type TestingModule} from '@nestjs/testing';
import {http, HttpResponse} from 'msw';
import {setupServer} from 'msw/node';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import {MapsModule} from '../maps.module.js';
import {MapasService} from '../maps.service.js';
import {NotFoundException} from '@nestjs/common';

const baseUrl = 'https://nominatim.test';
const server = setupServer();
const coordinates = {latitude: -15.7939, longitude: -47.8828};

describe('NominatimProvider', () => {
  let module: TestingModule;
  let service: MapasService;

  beforeAll(() => server.listen({onUnhandledRequest: 'error'}));
  afterAll(() => server.close());

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({isGlobal: true, ignoreEnvFile: true}),
        HttpClientModule.forRoot({}),
        MapsModule,
      ],
    })
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          NOMINATIM_API_URL: baseUrl,
        }),
      )
      .compile();
    await module.init();
    service = module.get(MapasService);
  });

  afterEach(async () => {
    await module.close();
    server.resetHandlers();
  });

  it('maps reverse geocoding response to the public DTO', async () => {
    server.use(
      http.get(`${baseUrl}/reverse`, () =>
        HttpResponse.json({
          lat: '-15.8',
          lon: '-47.9',
          display_name: 'Endereço de exemplo',
          address: {
            suburb: 'Asa Norte',
            city: 'Brasília',
            state: 'Distrito Federal',
            'ISO3166-2-lvl4': 'BR-DF',
            country_code: 'BR',
          },
        }),
      ),
    );

    await expect(service.reverseGeocode(coordinates)).resolves.toEqual({
      success: true,
      location: {
        coordinates,
        provider: 'nominatim',
        displayAddress: 'Endereço de exemplo',
        neighborhood: {name: 'Asa Norte', sourceField: 'suburb'},
        municipality: 'Brasília',
        state: 'Distrito Federal',
        stateCode: 'BR-DF',
        countryCode: 'br',
      },
    });
  });

  it('maps an upstream error payload to location not found', async () => {
    server.use(
      http.get(`${baseUrl}/reverse`, () =>
        HttpResponse.json({error: 'Unable to geocode'}),
      ),
    );

    await expect(service.reverseGeocode(coordinates)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('maps region search response to the public DTO', async () => {
    server.use(
      http.get(`${baseUrl}/search`, () =>
        HttpResponse.json([
          {
            place_id: 123,
            name: 'Asa Norte',
            address: {
              suburb: 'Asa Norte',
              city: 'Brasília',
              state: 'Distrito Federal',
            },
          },
        ]),
      ),
    );

    await expect(service.searchRegions('Asa Norte')).resolves.toEqual([
      {
        providerId: '123',
        name: 'Asa Norte',
        municipality: 'Brasília',
        state: 'Distrito Federal',
      },
    ]);
  });

  it.each([403, 429, 500, 503])(
    'propagates HTTP %s errors from the client',
    async status => {
      server.use(
        http.get(`${baseUrl}/reverse`, () =>
          HttpResponse.json({error: 'upstream'}, {status}),
        ),
      );

      await expect(service.reverseGeocode(coordinates)).rejects.toMatchObject({
        status,
      });
    },
  );

  it('propagates network errors from the client', async () => {
    server.use(http.get(`${baseUrl}/search`, () => HttpResponse.error()));

    await expect(service.searchRegions('Asa Norte')).rejects.toBeDefined();
  });
});
