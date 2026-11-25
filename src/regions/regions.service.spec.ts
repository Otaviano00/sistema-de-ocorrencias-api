import {NotFoundException} from '@nestjs/common';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {MapasService} from '../maps/mapas.service.js';
import {PrismaService} from '../prisma/prisma.service.js';
import {RegionsService} from './regions.service.js';

describe('RegionsService', () => {
  const prisma = {
    region: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
  };
  const maps = {searchRegions: vi.fn()};
  let service: RegionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RegionsService(
      prisma as unknown as PrismaService,
      maps as unknown as MapasService,
    );
  });

  it('returns only recognized neighborhoods with geographic context', async () => {
    maps.searchRegions.mockResolvedValue([
      {
        providerId: '123',
        name: 'Asa Norte',
        municipality: 'Brasília',
        state: 'Distrito Federal',
      },
    ]);

    await expect(service.search('Asa Norte')).resolves.toEqual([
      {
        providerId: '123',
        name: 'Asa Norte',
        municipality: 'Brasília',
        state: 'Distrito Federal',
      },
    ]);
    expect(maps.searchRegions).toHaveBeenCalledWith('Asa Norte');
  });

  it('activates a recognized region without trusting the display text', async () => {
    prisma.region.upsert.mockResolvedValue({id: 1, isActive: true});

    await service.activate({
      providerId: ' 123 ',
      name: ' Asa Norte ',
      municipality: ' Brasília ',
      state: ' Distrito Federal ',
    });

    expect(prisma.region.upsert).toHaveBeenCalledWith({
      where: {providerId: '123'},
      create: {
        providerId: '123',
        name: 'Asa Norte',
        municipality: 'Brasília',
        state: 'Distrito Federal',
        isActive: true,
      },
      update: {isActive: true},
    });
  });

  it('maps missing regions to a not found response', async () => {
    prisma.region.update.mockRejectedValue({code: 'P2025'});
    await expect(service.deactivate(99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
