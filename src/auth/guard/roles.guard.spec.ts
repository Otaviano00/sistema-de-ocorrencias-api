import {ExecutionContext} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {describe, expect, it, vi} from 'vitest';
import {RolesGuard} from './roles.guard.js';

const ctx = (role: string) =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({getRequest: () => ({user: {role}})}),
  }) as unknown as ExecutionContext;

const guardWith = (roles?: string[]) =>
  new RolesGuard({
    getAllAndOverride: vi.fn().mockReturnValue(roles),
  } as unknown as Reflector);

describe('RolesGuard', () => {
  it('releases when the route does not require paper', () => {
    expect(guardWith(undefined).canActivate(ctx('CITIZEN'))).toBe(true);
  });
  it('releases when the paper is in the list', () => {
    expect(guardWith(['ADMIN']).canActivate(ctx('ADMIN'))).toBe(true);
  });
  it('blocks when the paper is not in the list', () => {
    expect(guardWith(['ADMIN']).canActivate(ctx('CITIZEN'))).toBe(false);
  });
});
