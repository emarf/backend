import { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { PrismaService } from '../../src/database/prisma.service';
import { UsersService } from '../../src/users/users.service';
import { createTestApp } from '../utils';

// Which classes a service asks for in its constructor (Nest reads the same metadata for DI).
// Compared by identity, not by name: the class exported as `Pool` from 'pg' is named BoundPool
const dependenciesOf = (service: abstract new (...args: never[]) => unknown) =>
  (Reflect.getMetadata('design:paramtypes', service) ?? []) as unknown[];

describe('03 · Prisma inside Nest: users', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('UsersService gets PrismaService instead of the pg Pool', () => {
    const deps = dependenciesOf(UsersService);
    expect(deps).toContain(PrismaService);
    expect(deps).not.toContain(Pool);
  });

  it('GET /users/:id/orders still works', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/6/orders')
      .expect(200);
    expect(res.body).toHaveLength(19);
  });

  it('POST /users still answers 409 for a taken email', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'user1@mail.test', name: 'Copy' })
      .expect(409);
  });
});
