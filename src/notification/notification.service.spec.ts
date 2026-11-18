import {Test} from '@nestjs/testing';
import {vi, type Mock} from 'vitest';
import {NotificationService} from './notification.service.js';
import {UserService} from '../user/user.service.js';
import {EmailService} from '../email/email.service.js';

describe('NotificationService', () => {
  let service: NotificationService;

  let userService: {
    lookupEmail: Mock<UserService['lookupEmail']>;
  };

  let emailService: {
    sendEmail: Mock<EmailService['sendEmail']>;
  };

  beforeEach(async () => {
    userService = {
      lookupEmail: vi.fn<UserService['lookupEmail']>(),
    };

    emailService = {
      sendEmail: vi.fn<EmailService['sendEmail']>(),
    };

    const module = await Test.createTestingModule({
      providers: [
        NotificationService,
        {provide: UserService, useValue: userService},
        {provide: EmailService, useValue: emailService},
      ],
    }).compile();

    service = module.get(NotificationService);
  });

  it('should send the notification to the user email', async () => {
    userService.lookupEmail.mockResolvedValue('usuario@exemplo.com');
    emailService.sendEmail.mockResolvedValue(undefined);

    await service.sendNotification(42, 'Notification', 'Ocorrência atualizada');

    expect(userService.lookupEmail).toHaveBeenCalledWith(42);
    expect(userService.lookupEmail).toHaveBeenCalledOnce();
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      'usuario@exemplo.com',
      'Notification',
      'Ocorrência atualizada',
    );
  });
});
