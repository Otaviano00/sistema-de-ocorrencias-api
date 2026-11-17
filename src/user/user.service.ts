import {Injectable} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service.js';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  async findUser(id: number) {
    return this.prismaService.user.findUnique({
      where: {id},
    });
  }

  async lookupEmail(id: number) {
    const user = await this.prismaService.user.findUnique({
      where: {id: id},
      select: {email: true},
    });

    if (user === null) {
      throw new Error(`User with id ${id} not found`);
    }

    return user.email;
  }
}
