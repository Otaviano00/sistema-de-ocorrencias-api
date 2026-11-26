import {ConfigService} from '@nestjs/config';
import {describe, expect, it} from 'vitest';
import {NominatimClientConfig} from './nominatim-client.config.js';

describe('NominatimClientConfig', () => {
  it('configures the client from the environment', () => {
    const config = new NominatimClientConfig(
      new ConfigService({
        NOMINATIM_API_URL: 'https://nominatim.test',
        NOMINATIM_TIMEOUT: '2s',
      }),
    );

    expect(config.createHttpClientOptions()).toEqual({
      baseUrl: 'https://nominatim.test',
      timeout: '2s',
      retry: {
        attempts: 3,
        methods: ['GET'],
        statusCodes: [408, 429, 500, 502, 503, 504],
        backoff: {
          delay: '1s',
          factor: 2,
          maxDelay: '5s',
          jitter: 'full',
        },
      },
    });
  });

  it('throws when the base URL is missing', () => {
    const configService = {
      getOrThrow: () => {
        throw new Error('NOMINATIM_API_URL is missing');
      },
    } as unknown as ConfigService;
    const config = new NominatimClientConfig(configService);
    expect(() => config.createHttpClientOptions()).toThrow();
  });
});
