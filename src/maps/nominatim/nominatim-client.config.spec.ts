import {ConfigService} from '@nestjs/config';
import {describe, expect, it} from 'vitest';
import {NominatimClientConfig} from './nominatim-client.config.js';

function createConfig(overrides: Record<string, unknown> = {}) {
  return new NominatimClientConfig(
    new ConfigService({
      NOMINATIM_API_URL: 'https://nominatim.test/reverse',
      NOMINATIM_USER_AGENT: 'zelar-api-test/1.0',
      ...overrides,
    }),
  );
}

describe('NominatimClientConfig', () => {
  it.each([
    [{}, 5000],
    [{NOMINATIM_TIMEOUT_MS: '2500'}, 2500],
  ])(
    'configures the named client from the environment: %j',
    (values, timeout) => {
      expect(createConfig(values).createHttpClientOptions()).toEqual({
        baseUrl: 'https://nominatim.test/reverse',
        headers: {'User-Agent': 'zelar-api-test/1.0'},
        timeout,
        retry: false,
        redirect: 'error',
        throwOnHttpError: true,
      });
    },
  );

  it('uses safe public defaults when map environment is absent', () => {
    const options = new NominatimClientConfig(
      new ConfigService({}),
    ).createHttpClientOptions();
    expect(options.baseUrl).toBe('https://nominatim.openstreetmap.org/reverse');
    expect(options.headers?.['User-Agent']).toContain('zelar-api');
  });

  it.each([
    {NOMINATIM_USER_AGENT: ' '},
    {NOMINATIM_USER_AGENT: 'agent\r\nHeader: value'},
    {NOMINATIM_TIMEOUT_MS: 0},
    {NOMINATIM_TIMEOUT_MS: -1},
    {NOMINATIM_TIMEOUT_MS: 'invalid'},
  ])('rejects invalid identification or timeout: %j', values => {
    expect(() => createConfig(values).createHttpClientOptions()).toThrow();
  });
});
