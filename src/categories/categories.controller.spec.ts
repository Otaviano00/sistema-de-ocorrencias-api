import {Reflector} from '@nestjs/core';
import {Test} from '@nestjs/testing';
import {RolesGuard} from '../auth/guard/roles.guard.js';
import {CategoriesController} from './categories.controller.js';
import {CategoriesService} from './categories.service.js';
import {beforeEach, describe, expect, it, vi} from 'vitest';

describe('CategoriesController', () => {
  const service = {
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  let controller: CategoriesController;
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        Reflector,
        RolesGuard,
        {provide: CategoriesService, useValue: service},
      ],
    }).compile();
    controller = module.get(CategoriesController);
    reflector = module.get(Reflector);
    guard = module.get(RolesGuard);
  });

  it('allows listing categories without authentication', () => {
    const roles = reflector.get<string[] | undefined>(
      'roles',
      CategoriesController.prototype.findAll,
    );
    expect(roles).toBeUndefined();
  });

  it.each(['create', 'update'] as const)(
    'restricts %s to administrators',
    method => {
      const roles = reflector.get<string[] | undefined>(
        'roles',
        CategoriesController.prototype[method],
      );
      expect(roles).toEqual(['ADMIN']);
      const context = {
        getHandler: () => CategoriesController.prototype[method],
        getClass: () => CategoriesController,
        switchToHttp: () => ({getRequest: () => ({user: {role: 'CITIZEN'}})}),
      };
      expect(guard.canActivate(context as never)).toBe(false);
    },
  );

  it('delegates category listing, creation and updates', async () => {
    service.findAll.mockResolvedValue([{id: 1}]);
    service.create.mockResolvedValue({id: 1});
    service.update.mockResolvedValue({id: 1, name: 'Nova'});

    await expect(controller.findAll()).resolves.toEqual([{id: 1}]);
    await expect(controller.create({name: 'Nova'})).resolves.toEqual({id: 1});
    await expect(controller.update(1, {name: 'Nova'})).resolves.toEqual({
      id: 1,
      name: 'Nova',
    });
  });
});
