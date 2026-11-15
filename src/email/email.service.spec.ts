import { ConfigService } from '@nestjs/config';
import { getHttpClientToken } from '@nestjs/http-client';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service.js';

describe('EmailService', () => {
  let service: EmailService;
  const resendMock = { post: vi.fn() };
  const configServiceMock = { getOrThrow: vi.fn().mockReturnValue('test@example.com') };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: getHttpClientToken('resend'), useValue: resendMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});