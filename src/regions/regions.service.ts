import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {MapasService} from '../maps/maps.service.js';
import {PrismaService} from '../prisma/prisma.service.js';
import {ActivateRegionDto} from './dto/region.dto.js';

@Injectable()
export class RegionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly maps: MapasService,
  ) {}

  findAll() {
    return this.prisma.region.findMany({orderBy: {name: 'asc'}});
  }

  search(query: string) {
    const normalized = query.trim();
    if (normalized.length < 3) {
      throw new BadRequestException(
        'A busca precisa ter ao menos 3 caracteres.',
      );
    }
    return this.maps.searchRegions(normalized);
  }

  activate(dto: ActivateRegionDto) {
    const providerId = dto.providerId.trim();
    const name = dto.name.trim();
    const municipality = dto.municipality.trim();
    const state = dto.state.trim();
    if (!providerId || !name || !municipality || !state) {
      throw new BadRequestException('Região geográfica inválida.');
    }
    return this.prisma.region.upsert({
      where: {providerId},
      create: {providerId, name, municipality, state, isActive: true},
      update: {isActive: true},
    });
  }

  async activateExisting(id: number) {
    return this.updateStatus(id, true);
  }

  deactivate(id: number) {
    return this.updateStatus(id, false);
  }

  private async updateStatus(id: number, isActive: boolean) {
    try {
      return await this.prisma.region.update({
        where: {id},
        data: {isActive},
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Região não encontrada.');
      }
      throw error;
    }
  }
}
