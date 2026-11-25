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
import {RegionsController} from './regions.controller.js';
import {RegionsService} from './regions.service.js';

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
    if (context.switchToHttp().getRequest().user?.role !== 'ADMIN') {
      throw new ForbiddenException();
    }
    return true;
  }
}

describe('RegionsController HTTP authorization', () => {
  let app: INestApplication;
  const service = {
    findAll: vi.fn().mockResolvedValue([]),
    search: vi.fn().mockResolvedValue([]),
    activate: vi.fn().mockResolvedValue({id: 1, isActive: true}),
    deactivate: vi.fn().mockResolvedValue({id: 1, isActive: false}),
    activateExisting: vi.fn().mockResolvedValue({id: 1, isActive: true}),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [RegionsController],
      providers: [RolesGuard, {provide: RegionsService, useValue: service}],
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

  it('keeps listing public', async () => {
    await request(app.getHttpServer()).get('/regions').expect(200, []);
  });

  it('requires an administrator for searches and mutations', async () => {
    await request(app.getHttpServer()).get('/regions/search?q=asa').expect(401);
    await request(app.getHttpServer())
      .post('/regions')
      .set('Authorization', 'Bearer citizen')
      .send({
        providerId: '1',
        name: 'Asa',
        municipality: 'Brasília',
        state: 'DF',
      })
      .expect(403);
  });

  it('validates the recognized region payload', async () => {
    await request(app.getHttpServer())
      .post('/regions')
      .set('Authorization', 'Bearer admin')
      .send({providerId: '', name: 'Asa'})
      .expect(400);
  });

  it('updates activation status', async () => {
    await request(app.getHttpServer())
      .patch('/regions/1')
      .set('Authorization', 'Bearer admin')
      .send({isActive: false})
      .expect(200);
    expect(service.deactivate).toHaveBeenCalledWith(1);
  });
});
