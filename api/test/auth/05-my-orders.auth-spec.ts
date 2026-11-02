import { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { createTestApp, createTestDb } from '../utils';
import { loggedIn } from './utils';

describe('05 · GET /me/orders — authorization', () => {
  let app: INestApplication;
  let db: Pool;

  beforeAll(async () => {
    app = await createTestApp();
    db = createTestDb();
  });

  afterAll(async () => {
    await app.close();
    await db.end();
  });

  const orderFor = (userId: number) =>
    request(app.getHttpServer())
      .post('/orders')
      .send({ userId, eventId: 1, quantity: 2 })
      .expect(201)
      .then((res) => res.body.id as number);

  it('returns 401 without a session', async () => {
    await request(app.getHttpServer()).get('/me/orders').expect(401);
  });

  it('lists only the orders of the logged-in user', async () => {
    const { user, agent } = await loggedIn(app);
    const mine = await orderFor(user.id);
    await orderFor(1);

    const res = await agent.get('/me/orders').expect(200);
    const expected = await request(app.getHttpServer())
      .get(`/users/${user.id}/orders`)
      .expect(200);

    expect(res.body.map((o: { id: number }) => o.id)).toEqual([mine]);
    expect(res.body).toEqual(expected.body);
  });

  it("returns one of the user's own orders", async () => {
    const { user, agent } = await loggedIn(app);
    const mine = await orderFor(user.id);

    const res = await agent.get(`/me/orders/${mine}`).expect(200);
    expect(res.body).toMatchObject({ id: mine, status: 'pending' });
    expect(res.body.tickets).toHaveLength(2);
  });

  it("someone else's order looks exactly like a missing one: 404", async () => {
    const { agent } = await loggedIn(app);
    const theirs = await orderFor(1);

    await agent.get(`/me/orders/${theirs}`).expect(404);
    await agent.get('/me/orders/999999').expect(404);

    const owner = await db.query('SELECT user_id FROM orders WHERE id = $1', [
      theirs,
    ]);
    expect(owner.rows[0].user_id).toBe(1);
  });
});
