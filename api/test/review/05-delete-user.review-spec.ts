import { Pool } from 'pg';
import { errorCode, inRollback, readTaskSql } from './helpers';

describe('Review 05 · Delete an account', () => {
  let db: Pool;

  beforeAll(() => {
    db = new Pool({ connectionString: process.env.DATABASE_URL });
  });

  afterAll(() => db.end());

  it('deleting a user removes their orders and tickets', async () => {
    await inRollback(db, async (client) => {
      await client.query(readTaskSql('05-delete-user.sql'));

      await client.query('DELETE FROM users WHERE id = 1');

      const left = await client.query(`
        SELECT (SELECT count(*) FROM orders WHERE user_id = 1)::int AS orders,
               (SELECT count(*) FROM tickets t JOIN orders o ON o.id = t.order_id
                WHERE o.user_id = 1)::int AS tickets`);
      expect(left.rows[0]).toEqual({ orders: 0, tickets: 0 });
    });
  });

  it('other users keep their orders', async () => {
    await inRollback(db, async (client) => {
      await client.query(readTaskSql('05-delete-user.sql'));
      const before = await client.query(
        'SELECT count(*)::int AS n FROM orders WHERE user_id <> 1',
      );

      await client.query('DELETE FROM users WHERE id = 1');

      const after = await client.query(
        'SELECT count(*)::int AS n FROM orders WHERE user_id <> 1',
      );
      expect(after.rows[0].n).toBe(before.rows[0].n);
    });
  });

  it('an event with tickets still cannot be deleted', async () => {
    await inRollback(db, async (client) => {
      await client.query(readTaskSql('05-delete-user.sql'));
      expect(
        await errorCode(client.query('DELETE FROM events WHERE id = 1')),
      ).toBe('23503');
    });
  });
});
