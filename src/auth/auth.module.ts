import {Module} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {JwtModule} from '@nestjs/jwt';
import {AuthController} from './auth.controller.js';
import {AuthService} from './auth.service.js';
import {PrismaModule} from '../prisma/prisma.module.js';
import {JwtStrategy} from './jwt.strategy.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'jwt-secret'),
        signOptions: {expiresIn: '15d'},
      }),
    }),
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
