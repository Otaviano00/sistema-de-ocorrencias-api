import {Module} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';
import {AppController} from './app.controller.js';
import {AppService} from './app.service.js';
import {PrismaModule} from './prisma/prisma.module.js';
import {HttpClientModule} from '@nestjs/http-client';
import {AuthModule} from './auth/auth.module.js';
import {CategoriesModule} from './categories/categories.module.js';
import {RegionsModule} from './regions/regions.module.js';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot({isGlobal: true}),
    HttpClientModule.forRoot({
      headers: {'User-Agent': 'zelar-api/1.0'},
      timeout: '10s',
    }),
    AuthModule,
    CategoriesModule,
    RegionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
