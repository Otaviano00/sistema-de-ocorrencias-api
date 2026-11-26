import {Reflector} from '@nestjs/core';
import {Test} from '@nestjs/testing';
import {RolesGuard} from '../auth/guard/roles.guard.js';
import {RegionsController} from './regions.controller.js';
import {RegionsService} from './regions.service.js';
import {beforeEach, describe, expect, it, vi} from 'vitest';

describe('RegionsController', () => {
  const service = {
    findAll: vi.fn(),
    search: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn(),
    activateExisting: vi.fn(),
  };
  let controller: RegionsController;
  let reflector: Reflector;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [RegionsController],
      providers: [
        Reflector,
        RolesGuard,
        {provide: RegionsService, useValue: service},
      ],
    }).compile();
    controller = module.get(RegionsController);
    reflector = module.get(Reflector);
  });

  it('keeps listing public and search administrative', () => {
    expect(
      reflector.get('roles', RegionsController.prototype.findAll),
    ).toBeUndefined();
    expect(reflector.get('roles', RegionsController.prototype.search)).toEqual([
      'ADMIN',
    ]);
  });

  it.each(['activate', 'updateStatus'] as const)(
    'restricts %s to administrators',
    method => {
      expect(
        reflector.get('roles', RegionsController.prototype[method]),
      ).toEqual(['ADMIN']);
    },
  );

  it('delegates list, search and status changes', async () => {
    service.findAll.mockResolvedValue([{id: 1}]);
    service.search.mockResolvedValue([{providerId: '1'}]);
    service.activate.mockResolvedValue({id: 1, isActive: true});
    service.deactivate.mockResolvedValue({id: 1, isActive: false});

    await expect(controller.findAll()).resolves.toEqual([{id: 1}]);
    await expect(controller.search('asa')).resolves.toEqual([
      {providerId: '1'},
    ]);
    await expect(
      controller.activate({
        providerId: '1',
        name: 'Asa Norte',
        municipality: 'Brasília',
        state: 'Distrito Federal',
      }),
    ).resolves.toEqual({id: 1, isActive: true});
    await expect(
      controller.updateStatus(1, {isActive: false}),
    ).resolves.toEqual({
      id: 1,
      isActive: false,
    });
  });
});
