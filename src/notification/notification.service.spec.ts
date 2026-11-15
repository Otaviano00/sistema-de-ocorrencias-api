import { Test } from '@nestjs/testing';
import { vi, type Mock } from 'vitest';
import { NotificationService } from './notification.service.js';
import { UserService } from '../user/user.service.js';
import { ResendEmailSender } from './email/resendEmailSender.service.js';

describe('NotificationService', () => {
  let service: NotificationService;

  let users: {
    lookupEmail: Mock<UserService['lookupEmail']>;
  };

  let emailSender: {
    send: Mock<ResendEmailSender['send']>;
  };

  beforeEach(async () => {
    users = {
      lookupEmail: vi.fn<UserService['lookupEmail']>(),
    };

    emailSender = {
      send: vi.fn<ResendEmailSender['send']>(),
    };

    const module = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: UserService, useValue: users },
        { provide: ResendEmailSender, useValue: emailSender },
      ],
    }).compile();

    service = module.get(NotificationService);
  });

  it('should send the notification to the user email', async () => {
    users.lookupEmail.mockResolvedValue('usuario@exemplo.com');
    emailSender.send.mockResolvedValue(undefined);

    await service.sendNotification(42, 'Ocorrência atualizada');

    expect(users.lookupEmail).toHaveBeenCalledWith(42);
    expect(users.lookupEmail).toHaveBeenCalledOnce();
    expect(emailSender.send).toHaveBeenCalledWith(
      'usuario@exemplo.com',
      'Ocorrência atualizada',
    );
  });

});