import {validate} from 'class-validator';
import {describe, expect, it} from 'vitest';
import {ActivateRegionDto, UpdateRegionDto} from './region.dto.js';

describe('region DTOs', () => {
  it('requires complete geographic context', async () => {
    const dto = Object.assign(new ActivateRegionDto(), {
      providerId: '123',
      name: 'Asa Norte',
      municipality: 'Brasília',
      state: '',
    });
    const errors = await validate(dto);
    expect(errors.map(error => error.property)).toContain('state');
  });

  it('rejects non-boolean activation states', async () => {
    const dto = Object.assign(new UpdateRegionDto(), {isActive: 'false'});
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
