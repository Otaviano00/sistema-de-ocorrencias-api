import { Injectable } from '@nestjs/common';
import { HttpClient, InjectHttpClient } from '@nestjs/http-client';
import { ResendEmailResponseDTO } from './http-client/resend/dto/resend-email-response.dto.js';
import { ResendEmailRequestDTO } from './http-client/resend/dto/resend-email-request.dto.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
    constructor(
        @InjectHttpClient('resend') private readonly resend: HttpClient,
        private readonly config: ConfigService,
    ) {}

    async sendEmail(to: string, subject: string, body: string) {
        const request = this.createRequest(to, subject, body);
        
        const currentDate = new Date().toISOString();

        await this.resend.post<ResendEmailResponseDTO>('/emails', {
            headers: { 'Idempotency-Key': `send-email:${to} - ${currentDate}` },
            json: request
        });
    }

    private createRequest(to: string, subject: string, body: string) : ResendEmailRequestDTO {
        return {
            from: `Zelar <${this.config.getOrThrow<string>('EMAIL_FROM')}>`,
            to: [to],
            subject: subject,
            html: body
        };
    }
}
