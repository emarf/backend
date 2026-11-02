import { Pool } from 'pg';
import { errorCode, inRollback, readTaskSql } from './helpers';

describe('Review 02 · One CHECK, two directions', () => {
  let db: Pool;

  beforeAll(() => {
    db = new Pool({ connectionString: process.env.DATABASE_URL });
  });

  afterAll(() => db.end());

  // Adds the student's constraint, then tries one order; each case gets its own transaction
  const tryOrder = (status: string, paidAt: boolean) =>
    inRollback(db, async (client) => {
      await client.query(readTaskSql('02-paid-at-check.sql'));
      return errorCode(
        client.query(
          'INSERT INTO orders (user_id, status, created_at, paid_at) VALUES (1, $1, now(), $2)',
          [status, paidAt ? new Date() : null],
        ),
      );
    });

  it('is named orders_paid_at_matches_status_check and fits the existing data', async () => {
    await inRollback(db, async (client) => {
      await client.query(readTaskSql('02-paid-at-check.sql'));
      const res = await client.query(
        "SELECT 1 FROM pg_constraint WHERE conname = 'orders_paid_at_matches_status_check'",
      );
      expect(res.rows).toHaveLength(1);
    });
  });

  it.each([
    ['paid', true],
    ['refunded', true],
    ['pending', false],
    ['cancelled', false],
  ])('accepts a %s order with paid_at = %s', async (status, paidAt) => {
    expect(await tryOrder(status, paidAt)).toBe(
      'no error: the database accepted it',
    );
  });

  it.each([
    ['paid', false],
    ['refunded', false],
    ['pending', true],
    ['cancelled', true],
  ])('refuses a %s order with paid_at = %s', async (status, paidAt) => {
    expect(await tryOrder(status, paidAt)).toBe('23514');
  });
});
