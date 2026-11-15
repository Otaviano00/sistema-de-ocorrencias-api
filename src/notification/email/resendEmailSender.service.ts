import { Injectable } from "@nestjs/common";
import { BaseEmailSender } from "./baseEmailSender.service.js";

@Injectable()
export class ResendEmailSender extends BaseEmailSender {
    async send(to: string, message: string): Promise<void> {
        // Implement the actual email sending logic here
    }
}