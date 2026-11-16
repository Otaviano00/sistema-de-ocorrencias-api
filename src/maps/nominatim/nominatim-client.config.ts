import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { HttpClientFactoryOptions, HttpClientOptionsFactory } from '@nestjs/http-client';

@Injectable()
export class NominatimClientConfig implements HttpClientOptionsFactory {
  constructor(private readonly config: ConfigService) {}

  createHttpClientOptions(): HttpClientFactoryOptions {
    return {};
  }
}
