import {Injectable} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import type {
  HttpClientFactoryOptions,
  HttpClientOptionsFactory,
} from '@nestjs/http-client';

@Injectable()
export class NominatimClientConfig implements HttpClientOptionsFactory {
  constructor(private readonly config: ConfigService) {}

  createHttpClientOptions(): HttpClientFactoryOptions {
    const userAgent = this.config
      .get<string>(
        'NOMINATIM_USER_AGENT',
        'zelar-api/1.0 (https://github.com/Otaviano00/sistema-de-ocorrencias-api)',
      )
      .trim();
    if (!userAgent || /[\r\n]/.test(userAgent)) {
      throw new Error(
        'NOMINATIM_USER_AGENT must identify the application on a single line.',
      );
    }
    const timeout = Number(
      this.config.get<string | number>('NOMINATIM_TIMEOUT_MS', 5000),
    );
    if (!Number.isSafeInteger(timeout) || timeout <= 0) {
      throw new Error(
        'NOMINATIM_TIMEOUT_MS must be a positive integer in milliseconds.',
      );
    }
    return {
      baseUrl: this.config.get<string>(
        'NOMINATIM_API_URL',
        'https://nominatim.openstreetmap.org/reverse',
      ),
      headers: {'User-Agent': userAgent},
      timeout,
      retry: false,
      redirect: 'error',
      throwOnHttpError: true,
    };
  }
}
