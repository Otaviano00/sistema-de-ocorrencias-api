import {Test} from '@nestjs/testing';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {UserService} from './user.service.js';
import {PrismaService} from '../prisma/prisma.service.js';

describe('UserService', () => {
  let service: UserService;
  const prisma = {user: {findUnique: vi.fn()}};

  beforeEach(async () => {
    prisma.user.findUnique.mockReset();
    const module = await Test.createTestingModule({
      providers: [UserService, {provide: PrismaService, useValue: prisma}],
    }).compile();

    service = module.get(UserService);
  });

  it('finds a user by ID', async () => {
    const user = {
      id: 3,
      name: 'Pessoa',
      email: 'pessoa@example.com',
      passwordHash: 'hash',
      role: 'CITIZEN',
    };
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(service.findUser(3)).resolves.toEqual(user);
    expect(prisma.user.findUnique).toHaveBeenCalledExactlyOnceWith({
      where: {id: 3},
    });
  });

  it('returns null when the user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.findUser(3)).resolves.toBeNull();
  });

  it('looks up only the email for a user', async () => {
    prisma.user.findUnique.mockResolvedValue({email: 'pessoa@example.com'});

    await expect(service.lookupEmail(3)).resolves.toBe('pessoa@example.com');
    expect(prisma.user.findUnique).toHaveBeenCalledExactlyOnceWith({
      where: {id: 3},
      select: {email: true},
    });
  });

  it('rejects when looking up the email of a missing user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.lookupEmail(3)).rejects.toThrow(
      'User with id 3 not found',
    );
  });

  it('propagates database failures', async () => {
    const error = new Error('Database unavailable');
    prisma.user.findUnique.mockRejectedValue(error);

    await expect(service.findUser(3)).rejects.toBe(error);
    await expect(service.lookupEmail(3)).rejects.toBe(error);
  });
});
