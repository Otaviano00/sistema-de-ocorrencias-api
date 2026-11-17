import {Module} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';
import {AppController} from './app.controller.js';
import {AppService} from './app.service.js';
import {PrismaModule} from './prisma/prisma.module.js';
import {HttpClientModule} from '@nestjs/http-client';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot({isGlobal: true}),
    HttpClientModule.forRoot({
      headers: {'User-Agent': 'zelar-api/1.0'},
      timeout: '10s',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
