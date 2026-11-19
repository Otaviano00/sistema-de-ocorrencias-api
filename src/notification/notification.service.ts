import {Injectable} from '@nestjs/common';
import {UserService} from '../user/user.service.js';
import {EmailService} from '../email/email.service.js';

@Injectable()
export class NotificationService {
  constructor(
    private readonly userService: UserService,
    private readonly emailService: EmailService,
  ) {}

  async sendNotification(id: number, subject: string, message: string) {
    console.log(`Sending notification to user with ID: ${id}`);

    const email = await this.userService.lookupEmail(id);
    await this.emailService.sendEmail(email, subject, message);

    console.log(`Notification sent to user with ID: ${id}`);
  }
}
