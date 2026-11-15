import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationService {

    sendNotification(id: number, message: string) {
        console.log(`Sending notification: ${message}`);
    }
}
