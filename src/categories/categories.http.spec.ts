import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import {AuthGuard} from '@nestjs/passport';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {afterEach, beforeEach, describe, it, vi} from 'vitest';
import {RolesGuard} from '../auth/guard/roles.guard.js';
import {CategoriesController} from './categories.controller.js';
import {CategoriesService} from './categories.service.js';

class JwtTestGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    if (!request.headers.authorization) throw new UnauthorizedException();
    request.user = {
      role:
        request.headers.authorization === 'Bearer admin' ? 'ADMIN' : 'CITIZEN',
    };
    return true;
  }
}

class AdminRolesTestGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const role = context.switchToHttp().getRequest().user?.role;
    if (role !== 'ADMIN') throw new ForbiddenException();
    return true;
  }
}

describe('CategoriesController HTTP authorization', () => {
  let app: INestApplication;
  const service = {
    findAll: vi.fn().mockResolvedValue([]),
    create: vi
      .fn()
      .mockImplementation(dto => ({id: 1, ...dto, isActive: true})),
    update: vi
      .fn()
      .mockImplementation((id, dto) => ({id, ...dto, isActive: true})),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [RolesGuard, {provide: CategoriesService, useValue: service}],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useClass(JwtTestGuard)
      .overrideGuard(RolesGuard)
      .useClass(AdminRolesTestGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => app.close());

  it('keeps category listing public', async () => {
    await request(app.getHttpServer()).get('/categories').expect(200, []);
  });

  it.each(['post', 'patch'] as const)(
    'requires authentication for %s',
    async method => {
      const path = method === 'post' ? '/categories' : '/categories/1';
      await request(app.getHttpServer())
        [method](path)
        .send({name: 'Buraco'})
        .expect(401);
    },
  );

  it.each(['post', 'patch'] as const)(
    'requires an administrator for %s',
    async method => {
      const path = method === 'post' ? '/categories' : '/categories/1';
      await request(app.getHttpServer())
        [method](path)
        .set('Authorization', 'Bearer citizen')
        .send({name: 'Buraco'})
        .expect(403);
    },
  );

  it('allows an administrator to create a category', async () => {
    await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', 'Bearer admin')
      .send({name: ' Buraco '})
      .expect(201, {id: 1, name: 'Buraco', isActive: true});
  });

  it('allows an administrator to update a category', async () => {
    await request(app.getHttpServer())
      .patch('/categories/1')
      .set('Authorization', 'Bearer admin')
      .send({name: 'Via danificada'})
      .expect(200, {id: 1, name: 'Via danificada', isActive: true});
  });
});
