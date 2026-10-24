import { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { createTestApp, createTestDb } from './utils';

describe('08 · POST /orders/:id/pay — pay for an order', () => {
  let app: INestApplication;
  let db: Pool;

  const createOrder = async (status: string): Promise<number> => {
    const res = await db.query(
      'INSERT INTO orders (user_id, status, created_at) VALUES (1, $1, now()) RETURNING id',
      [status],
    );
    return res.rows[0].id;
  };

  beforeAll(async () => {
    app = await createTestApp();
    db = createTestDb();
  });

  afterAll(async () => {
    await app.close();
    await db.end();
  });

  it('marks a pending order as paid and returns 200', async () => {
    const id = await createOrder('pending');

    const res = await request(app.getHttpServer()).post(`/orders/${id}/pay`).expect(200);

    expect(res.body).toEqual({ id, status: 'paid' });
    const saved = await db.query('SELECT status FROM orders WHERE id = $1', [id]);
    expect(saved.rows[0].status).toBe('paid');
  });

  it('returns 409 when paying the same order twice', async () => {
    const id = await createOrder('pending');

    await request(app.getHttpServer()).post(`/orders/${id}/pay`).expect(200);
    await request(app.getHttpServer()).post(`/orders/${id}/pay`).expect(409);
  });

  it.each(['cancelled', 'refunded'])('returns 409 for a %s order and keeps its status', async (status) => {
    const id = await createOrder(status);

    await request(app.getHttpServer()).post(`/orders/${id}/pay`).expect(409);

    const saved = await db.query('SELECT status FROM orders WHERE id = $1', [id]);
    expect(saved.rows[0].status).toBe(status);
  });

  it('returns 404 for an order that does not exist', async () => {
    await request(app.getHttpServer()).post('/orders/99999/pay').expect(404);
  });
});
