import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils';

describe('06 · GET /users/:id/orders — orders with tickets', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns all orders of the user, newest first', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/6/orders')
      .expect(200);

    expect(res.body).toHaveLength(19);
    expect(res.body.slice(0, 4).map((o: { id: number }) => o.id)).toEqual([
      208, 992, 916, 666,
    ]);
  });

  it('returns each order with its total and tickets', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/6/orders')
      .expect(200);
    const order = res.body.find((o: { id: number }) => o.id === 376);

    expect(order).toEqual({
      id: 376,
      status: 'paid',
      createdAt: '2026-06-26T15:59:00.000Z',
      total: 522,
      tickets: expect.any(Array),
    });
    expect(order.tickets).toHaveLength(3);
    expect(order.tickets[0]).toEqual({
      id: expect.any(Number),
      eventId: expect.any(Number),
      seatNo: expect.any(Number),
      price: expect.any(Number),
    });
  });

  it('orders tickets inside an order by id', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/6/orders')
      .expect(200);

    for (const order of res.body) {
      const ids = order.tickets.map((t: { id: number }) => t.id);
      expect(ids).toEqual([...ids].sort((a, b) => a - b));
    }
  });

  it('returns an empty array for a user without orders', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/190/orders')
      .expect(200);

    expect(res.body).toEqual([]);
  });

  it('returns 404 for a user that does not exist', async () => {
    await request(app.getHttpServer()).get('/users/9999/orders').expect(404);
  });
});
