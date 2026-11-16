import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HttpClientModule } from '@nestjs/http-client';
import { MapsModule } from './maps/maps.module.js';

@Module({
  imports: [
    PrismaModule, 
    ConfigModule.forRoot({isGlobal: true}),
    MapsModule,
    HttpClientModule.forRoot({
      headers: { 'User-Agent': 'zelar-api/1.0' },
      timeout: '10s',
    }),     
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
