import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Duration, HttpClientFactoryOptions, HttpClientOptionsFactory } from "@nestjs/http-client";

@Injectable()
export class ResendClientConfig implements HttpClientOptionsFactory {
  constructor(private readonly config: ConfigService) {}

  createHttpClientOptions(): HttpClientFactoryOptions {
    return {
        baseUrl: this.config.getOrThrow<string>('RESEND_API_URL'),
        headers: { authorization: `Bearer ${this.config.getOrThrow<string>('RESEND_API_TOKEN')}` },
        timeout: this.config.get<Duration>('RESEND_TIMEOUT', '5s'),
    };
  }
}