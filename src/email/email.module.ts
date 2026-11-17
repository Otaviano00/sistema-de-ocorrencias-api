import {Module} from '@nestjs/common';
import {EmailService} from './email.service.js';
import {HttpClientModule} from '@nestjs/http-client';
import {ConfigModule} from '@nestjs/config';
import {ResendClientConfig} from './http-client/resend/resend-client.config.js';

@Module({
  imports: [
    HttpClientModule.registerAsync({
      name: 'resend',
      imports: [ConfigModule],
      useClass: ResendClientConfig,
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
