import {Module} from '@nestjs/common';
import {MapsModule} from '../maps/maps.module.js';
import {PrismaModule} from '../prisma/prisma.module.js';
import {RegionsController} from './regions.controller.js';
import {RegionsService} from './regions.service.js';

@Module({
  imports: [PrismaModule, MapsModule],
  controllers: [RegionsController],
  providers: [RegionsService],
})
export class RegionsModule {}
