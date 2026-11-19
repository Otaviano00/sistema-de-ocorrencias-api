import {Injectable, UnauthorizedException} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {LoginDto} from './dto/login.dto.js';
import {PrismaService} from '../prisma/prisma.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({where: {email: dto.email}});
    const ok = user && (await bcrypt.compare(dto.password, user.passwordHash));

    if (!user || !ok) throw new UnauthorizedException('Credenciais inválidas');

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
    });

    return {accessToken};
  }
}
