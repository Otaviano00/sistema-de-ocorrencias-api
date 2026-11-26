import {Injectable} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {
  Duration,
  HttpClientFactoryOptions,
  HttpClientOptionsFactory,
} from '@nestjs/http-client';

@Injectable()
export class NominatimClientConfig implements HttpClientOptionsFactory {
  constructor(private readonly config: ConfigService) {}

  createHttpClientOptions(): HttpClientFactoryOptions {
    return {
      baseUrl: this.config.getOrThrow<string>('NOMINATIM_API_URL'),
      timeout: this.config.get<Duration>('NOMINATIM_TIMEOUT', '5s'),
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
    };
  }
}
