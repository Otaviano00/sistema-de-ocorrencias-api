import {Module} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';
import {HttpClientModule} from '@nestjs/http-client';
import {MapProvider} from './map.provider.js';
import {MapasService} from './mapas.service.js';
import {NominatimClientConfig} from './nominatim/nominatim-client.config.js';
import {NominatimProvider} from './nominatim/nominatim.provider.js';

@Module({
  imports: [
    HttpClientModule.registerAsync({
      name: 'nominatim',
      imports: [ConfigModule],
      useClass: NominatimClientConfig,
    }),
  ],
  providers: [
    MapasService,
    NominatimProvider,
    {provide: MapProvider, useExisting: NominatimProvider},
  ],
  exports: [MapasService],
})
export class MapsModule {}
