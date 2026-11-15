import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { NotificationModule } from './notification/notification.module.js';
import { UserService } from './user/user.service.js';

@Module({
  imports: [PrismaModule, ConfigModule.forRoot({isGlobal: true}), NotificationModule],
  controllers: [AppController],
  providers: [AppService, ConfigService, UserService],
})
export class AppModule {}
