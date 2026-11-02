import { Pool, PoolClient } from 'pg';
import { inRollback, readTaskSql } from './helpers';

describe('Review 01 · Free tickets in one INSERT', () => {
  let db: Pool;
  const run = (client: PoolClient, params: number[]) =>
    client.query(readTaskSql('01-comp-tickets.sql'), params);

  beforeAll(() => {
    db = new Pool({ connectionString: process.env.DATABASE_URL });
  });

  afterAll(() => db.end());

  async function newOrder(client: PoolClient): Promise<number> {
    const res = await client.query(
      "INSERT INTO orders (user_id, status, created_at) VALUES (1, 'pending', now()) RETURNING id",
    );
    return res.rows[0].id;
  }

  it('continues after the highest seat of the event, with price 0', async () => {
    await inRollback(db, async (client) => {
      const max = await client.query(
        'SELECT max(seat_no) AS max FROM tickets WHERE event_id = 1',
      );
      const orderId = await newOrder(client);

      const res = await run(client, [orderId, 1, 3]);

      const highest: number = max.rows[0].max;
      expect(res.rows.map((r) => r.seat_no).sort((a, b) => a - b)).toEqual([
        highest + 1,
        highest + 2,
        highest + 3,
      ]);
      expect(res.rows.every((r) => Number(r.price) === 0)).toBe(true);
      expect(res.rows[0].id).toEqual(expect.any(Number));

      const saved = await client.query(
        'SELECT count(*)::int AS n FROM tickets WHERE order_id = $1 AND event_id = 1',
        [orderId],
      );
      expect(saved.rows[0].n).toBe(3);
    });
  });

  it('starts at seat 1 for an event without tickets', async () => {
    await inRollback(db, async (client) => {
      const event = await client.query(
        "INSERT INTO events (venue_id, title, category, starts_at, base_price) VALUES (1, 'Empty', 'concert', now(), 10) RETURNING id",
      );
      const orderId = await newOrder(client);

      const res = await run(client, [orderId, event.rows[0].id, 2]);

      expect(res.rows.map((r) => r.seat_no).sort()).toEqual([1, 2]);
    });
  });
});
