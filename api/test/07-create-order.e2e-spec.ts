import { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { createTestApp, createTestDb } from './utils';

describe('07 · POST /orders — book tickets', () => {
  let app: INestApplication;
  let db: Pool;
  let userId: number;
  let smallEventId: number;
  let smallVenueId: number;

  beforeAll(async () => {
    app = await createTestApp();
    db = createTestDb();

    const user = await db.query(
      "INSERT INTO users (email, name, created_at) VALUES ('buyer.07@mail.test', 'Buyer', now()) RETURNING id",
    );
    userId = user.rows[0].id;

    // A tiny venue with 3 seats, to test running out of seats
    const venue = await db.query(
      "INSERT INTO venues (name, city, capacity) VALUES ('Tiny Room', 'Paris', 3) RETURNING id",
    );
    const event = await db.query(
      `INSERT INTO events (venue_id, title, category, starts_at, base_price)
       VALUES ($1, 'Tiny Concert', 'concert', '2026-12-01 19:00+00', 25.50) RETURNING id`,
      [venue.rows[0].id],
    );
    smallEventId = event.rows[0].id;
    smallVenueId = venue.rows[0].id;
  });

  // Remove the extra venue and event, so other test files see the original data
  afterAll(async () => {
    await db.query('DELETE FROM tickets WHERE event_id = $1', [smallEventId]);
    await db.query(
      'DELETE FROM orders o WHERE o.user_id = $1 AND NOT EXISTS (SELECT 1 FROM tickets t WHERE t.order_id = o.id)',
      [userId],
    );
    await db.query('DELETE FROM events WHERE id = $1', [smallEventId]);
    await db.query('DELETE FROM venues WHERE id = $1', [smallVenueId]);
    await app.close();
    await db.end();
  });

  it('creates a pending order with tickets and returns 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/orders')
      .send({ userId, eventId: 40, quantity: 2 })
      .expect(201);

    expect(res.body).toEqual({
      id: expect.any(Number),
      userId,
      status: 'pending',
      total: 120,
      tickets: [
        { id: expect.any(Number), eventId: 40, seatNo: 46, price: 60 },
        { id: expect.any(Number), eventId: 40, seatNo: 47, price: 60 },
      ],
    });
  });

  it('really saves the order and tickets in the database', async () => {
    const res = await request(app.getHttpServer())
      .post('/orders')
      .send({ userId, eventId: 40, quantity: 1 })
      .expect(201);

    const order = await db.query('SELECT user_id, status FROM orders WHERE id = $1', [res.body.id]);
    const tickets = await db.query('SELECT seat_no FROM tickets WHERE order_id = $1', [res.body.id]);
    expect(order.rows).toEqual([{ user_id: userId, status: 'pending' }]);
    expect(tickets.rows).toEqual([{ seat_no: 48 }]);
  });

  it('returns 409 when there are not enough free seats, and saves nothing', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .send({ userId, eventId: smallEventId, quantity: 2 })
      .expect(201);

    const before = await db.query('SELECT count(*)::int AS n FROM orders');
    await request(app.getHttpServer())
      .post('/orders')
      .send({ userId, eventId: smallEventId, quantity: 2 })
      .expect(409);
    const after = await db.query('SELECT count(*)::int AS n FROM orders');

    expect(after.rows[0].n).toBe(before.rows[0].n);
  });

  it('returns 404 when the user does not exist', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .send({ userId: 9999, eventId: 40, quantity: 1 })
      .expect(404);
  });

  it('returns 404 when the event does not exist', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .send({ userId, eventId: 9999, quantity: 1 })
      .expect(404);
  });

  it.each([
    ['quantity 0', { quantity: 0 }],
    ['quantity 11', { quantity: 11 }],
    ['quantity 1.5', { quantity: 1.5 }],
    ['a missing eventId', { eventId: undefined }],
  ])('returns 400 for %s', async (_, override) => {
    await request(app.getHttpServer())
      .post('/orders')
      .send({ userId, eventId: 40, quantity: 1, ...override })
      .expect(400);
  });
});
