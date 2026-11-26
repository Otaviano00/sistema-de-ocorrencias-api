import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {Auth} from '../auth/auth.decorator.js';
import {CategoriesService} from './categories.service.js';
import {CategoryNameDto} from './dto/category-name.dto.js';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Post()
  @Auth('ADMIN')
  create(@Body() dto: CategoryNameDto) {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @Auth('ADMIN')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: CategoryNameDto) {
    return this.categoriesService.update(id, dto);
  }
}
