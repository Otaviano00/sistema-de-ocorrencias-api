import {Module} from '@nestjs/common';
import {ConfigModule, ConfigService} from '@nestjs/config';
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
    ConfigService,
    MapasService,
    NominatimProvider,
    {
      provide: 'NOMINATIM_SEARCH_URL',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = new URL(config.getOrThrow<string>('NOMINATIM_API_URL'));
        url.pathname = '/search';
        return url.toString();
      },
    },
    {provide: MapProvider, useExisting: NominatimProvider},
  ],
  exports: [MapasService],
})
export class MapsModule {}
