import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service.js';
import { ResendEmailSender } from './email/resendEmailSender.service.js';

@Injectable()
export class NotificationService {
    constructor(
        private readonly userService: UserService,
        private readonly emailSender: ResendEmailSender,
    ) {}

    async sendNotification(id: number, message: string) {
        console.log(`Sending notification to user with ID: ${id}`);

        const email = await this.userService.lookupEmail(id);
        await this.emailSender.send(email, message);

        console.log(`Notification sent to user with ID: ${id}`);
    }
}
