import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {Auth} from '../auth/auth.decorator.js';
import {ActivateRegionDto, UpdateRegionDto} from './dto/region.dto.js';
import {RegionsService} from './regions.service.js';

@Controller('regions')
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  @Get()
  findAll() {
    return this.regionsService.findAll();
  }

  @Get('search')
  @Auth('ADMIN')
  search(@Query('q') query: string) {
    return this.regionsService.search(query ?? '');
  }

  @Post()
  @Auth('ADMIN')
  activate(@Body() dto: ActivateRegionDto) {
    return this.regionsService.activate(dto);
  }

  @Patch(':id')
  @Auth('ADMIN')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRegionDto,
  ) {
    return dto.isActive
      ? this.regionsService.activateExisting(id)
      : this.regionsService.deactivate(id);
  }
}
