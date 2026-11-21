import {NotFoundException} from '@nestjs/common';
import {Test} from '@nestjs/testing';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {PrismaService} from '../prisma/prisma.service.js';
import {CategoriesService} from './categories.service.js';

describe('CategoriesService', () => {
  let service: CategoriesService;
  const prisma = {
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {provide: PrismaService, useValue: prisma},
      ],
    }).compile();
    service = module.get(CategoriesService);
  });

  it('lists categories ordered by name', async () => {
    const categories = [
      {id: 1, name: 'Buraco', isActive: true},
      {id: 2, name: 'Iluminação', isActive: false},
    ];
    prisma.category.findMany.mockResolvedValue(categories);

    await expect(service.findAll()).resolves.toEqual(categories);
    expect(prisma.category.findMany).toHaveBeenCalledExactlyOnceWith({
      orderBy: {name: 'asc'},
    });
  });

  it('creates an active category with a trimmed name', async () => {
    const category = {id: 1, name: 'Buraco', isActive: true};
    prisma.category.findUnique.mockResolvedValue(null);
    prisma.category.create.mockResolvedValue(category);

    await expect(service.create({name: '  Buraco  '})).resolves.toEqual(
      category,
    );
    expect(prisma.category.create).toHaveBeenCalledExactlyOnceWith({
      data: {name: 'Buraco', isActive: true},
    });
  });

  it('updates a category while preserving its active state', async () => {
    const category = {id: 1, name: 'Buraco', isActive: false};
    prisma.category.update.mockResolvedValue({
      ...category,
      name: 'Via danificada',
    });

    await expect(
      service.update(1, {name: ' Via danificada '}),
    ).resolves.toEqual({
      ...category,
      name: 'Via danificada',
    });
    expect(prisma.category.update).toHaveBeenCalledExactlyOnceWith({
      where: {id: 1},
      data: {name: 'Via danificada'},
    });
  });

  it('rejects updating an unknown category', async () => {
    prisma.category.update.mockRejectedValue({code: 'P2025'});

    await expect(service.update(99, {name: 'Buraco'})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('propagates unexpected update failures', async () => {
    const error = new Error('Database unavailable');
    prisma.category.update.mockRejectedValue(error);

    await expect(service.update(1, {name: 'Buraco'})).rejects.toBe(error);
  });
});
