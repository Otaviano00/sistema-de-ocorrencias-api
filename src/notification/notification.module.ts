import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service.js';
import { UserModule } from '../user/user.module.js';

@Module({
  imports: [UserModule],
  providers: [NotificationService],
  exports: [NotificationService]
})
export class NotificationModule {}
