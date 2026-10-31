import { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { PrismaService } from '../../src/database/prisma.service';
import { OrdersService } from '../../src/orders/orders.service';
import { createTestApp } from '../utils';

// Which classes a service asks for in its constructor (Nest reads the same metadata for DI).
// Compared by identity, not by name: the class exported as `Pool` from 'pg' is named BoundPool
const dependenciesOf = (service: abstract new (...args: never[]) => unknown) =>
  (Reflect.getMetadata('design:paramtypes', service) ?? []) as unknown[];

describe('08 · Transactions in Prisma: orders', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('OrdersService gets PrismaService instead of the pg Pool', () => {
    const deps = dependenciesOf(OrdersService);
    expect(deps).toContain(PrismaService);
    expect(deps).not.toContain(Pool);
  });

  it('POST /orders books tickets and adds the prices exactly', async () => {
    // Event 3 costs 140.50: three tickets must give exactly 421.5
    const res = await request(app.getHttpServer())
      .post('/orders')
      .send({ userId: 1, eventId: 3, quantity: 3 })
      .expect(201);
    expect(res.body.total).toBe(421.5);
    expect(res.body.tickets).toHaveLength(3);
  });
});
