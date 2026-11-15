import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service.js';

@Module({
  providers: [NotificationService]
})
export class NotificationModule {}
