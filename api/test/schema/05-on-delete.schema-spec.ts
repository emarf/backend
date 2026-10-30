import { Pool } from 'pg';
import { pgErrorCode } from './helpers';

// 23503 = foreign_key_violation
describe('05 · What happens on DELETE', () => {
  let db: Pool;

  beforeAll(() => {
    db = new Pool({ connectionString: process.env.DATABASE_URL });
  });

  afterAll(async () => {
    await db.end();
  });

  const createOrderWithTickets = async (seats: number[]): Promise<number> => {
    const order = await db.query(
      "INSERT INTO orders (user_id, status, created_at) VALUES (1, 'cancelled', now()) RETURNING id",
    );
    const orderId: number = order.rows[0].id;
    for (const seat of seats) {
      await db.query(
        'INSERT INTO tickets (order_id, event_id, seat_no, price) VALUES ($1, 2, $2, 10)',
        [orderId, seat],
      );
    }
    return orderId;
  };

  it('deleting an order deletes its tickets', async () => {
    const orderId = await createOrderWithTickets([5001, 5002]);

    await db.query('DELETE FROM orders WHERE id = $1', [orderId]);

    const left = await db.query('SELECT 1 FROM tickets WHERE order_id = $1', [
      orderId,
    ]);
    expect(left.rows).toHaveLength(0);
  });

  it('a user with orders still cannot be deleted', async () => {
    expect(await pgErrorCode(db.query('DELETE FROM users WHERE id = 1'))).toBe(
      '23503',
    );
  });

  it('an event with sold tickets still cannot be deleted', async () => {
    expect(await pgErrorCode(db.query('DELETE FROM events WHERE id = 2'))).toBe(
      '23503',
    );
  });
});
