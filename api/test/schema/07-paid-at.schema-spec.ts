import { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { createTestApp } from '../utils';
import { loadPrismaModule, pgErrorCode } from './helpers';

describe('07 · New column with existing data: orders.paid_at', () => {
  let app: INestApplication;
  let db: Pool;

  beforeAll(async () => {
    app = await createTestApp();
    db = new Pool({ connectionString: process.env.DATABASE_URL });
  });

  afterAll(async () => {
    await app.close();
    await db.end();
  });

  it('every paid or refunded order from before the migration has paid_at', async () => {
    const res = await db.query(`
      SELECT status, count(*)::int AS orders, count(paid_at)::int AS with_paid_at
      FROM orders WHERE id <= 1000 GROUP BY status ORDER BY status`);
    expect(res.rows).toEqual([
      { status: 'cancelled', orders: 79, with_paid_at: 0 },
      { status: 'paid', orders: 774, with_paid_at: 774 },
      { status: 'pending', orders: 80, with_paid_at: 0 },
      { status: 'refunded', orders: 67, with_paid_at: 67 },
    ]);
  });

  it('the database refuses a paid order without paid_at', async () => {
    const code = await pgErrorCode(
      db.query(
        "INSERT INTO orders (user_id, status, created_at) VALUES (1, 'paid', now())",
      ),
    );
    expect(code).toBe('23514');
  });

  it('the database refuses a pending order with paid_at', async () => {
    const code = await pgErrorCode(
      db.query(
        "INSERT INTO orders (user_id, status, created_at, paid_at) VALUES (1, 'pending', now(), now())",
      ),
    );
    expect(code).toBe('23514');
  });

  it('POST /orders/:id/pay sets paid_at', async () => {
    const order = await db.query(
      "INSERT INTO orders (user_id, status, created_at) VALUES (1, 'pending', now()) RETURNING id",
    );
    const id: number = order.rows[0].id;

    await request(app.getHttpServer()).post(`/orders/${id}/pay`).expect(200);

    const saved = await db.query(
      "SELECT paid_at, now() - paid_at < interval '1 minute' AS just_now FROM orders WHERE id = $1",
      [id],
    );
    expect(saved.rows[0].just_now).toBe(true);
  });

  it('the Prisma model has a paidAt field', () => {
    const { Prisma } = loadPrismaModule();
    expect(Object.keys(Prisma.OrderScalarFieldEnum)).toContain('paidAt');
  });
});
