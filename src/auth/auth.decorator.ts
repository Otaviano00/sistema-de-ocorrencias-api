import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from './guard/roles.guard.js';

export const Auth = (...roles: Array<'CITIZEN' | 'MODERATOR' | 'ADMIN'>) =>
  applyDecorators(SetMetadata('roles', roles), UseGuards(AuthGuard('jwt'), RolesGuard));