import { Injectable } from '@nestjs/common';
import { HttpClient, InjectHttpClient } from '@nestjs/http-client';
import { ResendEmailResponseDTO } from './http-client/resend/dto/resend-email-response.dto.js';
import { ResendEmailRequestDTO } from './http-client/resend/dto/resend-email-request.dto.js';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

@Injectable()
export class EmailService {
    constructor(
        @InjectHttpClient('resend') private readonly resend: HttpClient,
        private readonly config: ConfigService,
    ) {}

    /**
     * Pass a stable key to deduplicate the same logical email across separate calls.
     */
    async sendEmail(
        to: string,
        subject: string,
        body: string,
        idempotencyKey = `send-email:${randomUUID()}`,
    ): Promise<void> {
        const request = this.createRequest(to, subject, body);

        await this.resend.post<ResendEmailResponseDTO>('/emails', {
            headers: { 'Idempotency-Key': idempotencyKey },
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
