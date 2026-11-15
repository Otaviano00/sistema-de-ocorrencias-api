import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailModule } from './email.module.js';
import { EmailService } from './email.service.js';

const RESEND_URL = 'https://resend.test';

const server = setupServer();

describe('EmailService', () => {
  let module: TestingModule;
  let service: EmailService;

  const configServiceMock = {
    getOrThrow: vi.fn((key: string) => {
      const values: Record<string, string> = {
        EMAIL_FROM: 'no-reply@example.com',
        RESEND_API_URL: RESEND_URL,
        RESEND_API_TOKEN: 'test-token',
      };
      return values[key];
    }),
    get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
  };

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(async () => {
    await module.close();
    server.resetHandlers();
    vi.restoreAllMocks();
  });
  afterAll(() => server.close());

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), EmailModule],
    })
      .overrideProvider(ConfigService)
      .useValue(configServiceMock)
      .compile();

    service = module.get(EmailService);
  });

  it('sends an email request with the configured sender and idempotency key', async () => {
    const requestKeys: string[] = [];
    let requestBody: unknown;

    server.use(
      http.post(`${RESEND_URL}/emails`, async ({ request }) => {
        requestKeys.push(request.headers.get('Idempotency-Key') ?? '');
        requestBody = await request.json();
        return HttpResponse.json({ id: 'email-123' });
      }),
    );

    await service.sendEmail(
      'user@example.com',
      'Occurrence update',
      '<p>Updated</p>',
      'occurrence-42-email',
    );

    expect(requestKeys).toEqual(['occurrence-42-email']);
    expect(requestBody).toEqual({
      from: 'Zelar <no-reply@example.com>',
      to: ['user@example.com'],
      subject: 'Occurrence update',
      html: '<p>Updated</p>',
    });
  });

  it('generates an idempotency key when the caller does not provide one', async () => {
    let requestKey = '';

    server.use(
      http.post(`${RESEND_URL}/emails`, ({ request }) => {
        requestKey = request.headers.get('Idempotency-Key') ?? '';
        return HttpResponse.json({ id: 'email-123' });
      }),
    );

    await service.sendEmail('user@example.com', 'Subject', '<p>Body</p>');

    expect(requestKey).toMatch(/^send-email:[0-9a-f-]{36}$/);
  });

  it('retries transient server errors using jitter and reuses the idempotency key', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    const requestKeys: string[] = [];
    let attempts = 0;

    server.use(
      http.post(`${RESEND_URL}/emails`, ({ request }) => {
        attempts += 1;
        requestKeys.push(request.headers.get('Idempotency-Key') ?? '');
        return attempts === 1
          ? new HttpResponse(null, { status: 503 })
          : HttpResponse.json({ id: 'email-123' });
      }),
    );

    await service.sendEmail('user@example.com', 'Subject', '<p>Body</p>', 'occurrence-42-email');

    expect(attempts).toBe(2);
    expect(requestKeys).toEqual(['occurrence-42-email', 'occurrence-42-email']);
    expect(random).toHaveBeenCalled();
  });

  it('does not retry a non-transient client error', async () => {
    let attempts = 0;
    server.use(
      http.post(`${RESEND_URL}/emails`, () => {
        attempts += 1;
        return HttpResponse.json({ message: 'invalid recipient' }, { status: 400 });
      }),
    );

    await expect(service.sendEmail('invalid', 'Subject', '<p>Body</p>')).rejects.toThrow();
    expect(attempts).toBe(1);
  });

  it('rejects after exhausting transient error retries', async () => {
    let attempts = 0;
    server.use(
      http.post(`${RESEND_URL}/emails`, () => {
        attempts += 1;
        return new HttpResponse(null, { status: 503 });
      }),
    );

    await expect(service.sendEmail('user@example.com', 'Subject', '<p>Body</p>')).rejects.toThrow();
    expect(attempts).toBe(3);
  });
});
