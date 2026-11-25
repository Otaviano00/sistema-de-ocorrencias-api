import {Injectable, NotFoundException} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service.js';
import {CategoryNameDto} from './dto/category-name.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({orderBy: {name: 'asc'}});
  }

  create(dto: CategoryNameDto) {
    return this.prisma.category.create({
      data: {name: dto.name.trim(), isActive: true},
    });
  }

  async update(id: number, dto: CategoryNameDto) {
    try {
      return await this.prisma.category.update({
        where: {id},
        data: {name: dto.name.trim()},
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Categoria não encontrada.');
      }
      throw error;
    }
  }
}
