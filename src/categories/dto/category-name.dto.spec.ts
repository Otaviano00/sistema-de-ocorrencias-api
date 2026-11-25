import {BadRequestException, ValidationPipe} from '@nestjs/common';
import {describe, expect, it} from 'vitest';
import {CategoryNameDto} from './category-name.dto.js';

describe('CategoryNameDto', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const metadata = {type: 'body' as const, metatype: CategoryNameDto, data: ''};

  it('trims category names', async () => {
    await expect(
      pipe.transform({name: '  Buraco  '}, metadata),
    ).resolves.toEqual({name: 'Buraco'});
  });

  it.each([{name: ''}, {name: '   '}, {name: 10}, {}])(
    'rejects invalid category names: %j',
    async value => {
      await expect(pipe.transform(value, metadata)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );

  it('rejects category names over 100 characters', async () => {
    await expect(
      pipe.transform({name: 'a'.repeat(101)}, metadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unexpected fields', async () => {
    await expect(
      pipe.transform({name: 'Buraco', isActive: false}, metadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
