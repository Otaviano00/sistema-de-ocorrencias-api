import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';

vi.mock('bcrypt');

describe('AuthService', () => {
  const prisma = { user: { create: vi.fn(), findUnique: vi.fn() } };
  const jwt = { signAsync: vi.fn() };
  let service: AuthService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new AuthService(prisma as any, jwt as any);
  });

  describe('login', () => {
    const dto = { email: 'ana@gmail.com', password: '12345678' };
    const user = { id: 1, role: 'CITIZEN', passwordHash: 'HASH' };

    it('returns an accessToken with sub and role', async () => {
      prisma.user.findUnique.mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      jwt.signAsync.mockResolvedValue('TOKEN');

      await expect(service.login(dto)).resolves.toEqual({ accessToken: 'TOKEN' });
      expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 1, role: 'CITIZEN' });
    });

    it('rejects non-existent email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login(dto)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects incorrect password', async () => {
      prisma.user.findUnique.mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
      await expect(service.login(dto)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});