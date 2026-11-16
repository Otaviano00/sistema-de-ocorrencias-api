import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { HttpClientFactoryOptions, HttpClientOptionsFactory } from '@nestjs/http-client';

@Injectable()
export class NominatimClientConfig implements HttpClientOptionsFactory {
  constructor(private readonly config: ConfigService) {}

  createHttpClientOptions(): HttpClientFactoryOptions {
    return {
      baseUrl: this.config.getOrThrow<string>('NOMINATIM_API_URL'),
      headers: { 'User-Agent': this.config.getOrThrow<string>('NOMINATIM_USER_AGENT') },
      timeout: Number(this.config.get<string | number>('NOMINATIM_TIMEOUT_MS', 5000)),
      retry: false, redirect: 'error', throwOnHttpError: true,
    };
  }
}
