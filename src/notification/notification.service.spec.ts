import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service.js';
import { UserService } from '../user/user.service.js';
import { BaseEmailSender } from './email/baseEmailSender.service.js';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationService],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send a notification to the user email', async () => {
    const users = {
      lookupEmail: vi
        .fn<UserService['lookupEmail']>()
        .mockResolvedValue('usuario@exemplo.com'),
    };

    const emailSender = {
      send: vi
        .fn<BaseEmailSender['send']>()
        .mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: UserService, useValue: users },
        { provide: BaseEmailSender, useValue: emailSender },
      ],
    }).compile();

    const service = module.get<NotificationService>(NotificationService);

    await service.sendNotification(42, 'Sua ocorrência foi atualizada');

    expect(users.lookupEmail).toHaveBeenCalledWith(42);
    expect(emailSender.send).toHaveBeenCalledOnce();
    expect(emailSender.send).toHaveBeenCalledWith(
      'usuario@exemplo.com',
      'Sua ocorrência foi atualizada',
    );
  });
});
