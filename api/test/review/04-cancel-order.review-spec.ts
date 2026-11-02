import { Pool } from 'pg';
import { createPrisma } from '../schema/helpers';
import { cancelOrder } from '../../../exercises/review-1/04-cancel-order';

describe('Review 04 · Cancel an order without a race', () => {
  let db: Pool;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  beforeAll(() => {
    db = new Pool({ connectionString: process.env.DATABASE_URL });
    prisma = createPrisma();
  });

  afterAll(async () => {
    await db.end();
    await prisma.$disconnect();
  });

  async function newOrder(status = 'pending'): Promise<number> {
    const res = await db.query(
      'INSERT INTO orders (user_id, status, created_at, paid_at) VALUES (1, $1, now(), $2) RETURNING id',
      [status, status === 'paid' ? new Date() : null],
    );
    return res.rows[0].id;
  }

  const statusOf = async (id: number) =>
    (await db.query('SELECT status FROM orders WHERE id = $1', [id])).rows[0]
      .status;

  it('cancels a pending order', async () => {
    const id = await newOrder();
    expect(await cancelOrder(prisma, id)).toBe('cancelled');
    expect(await statusOf(id)).toBe('cancelled');
  });

  it('returns not_found for an order that does not exist', async () => {
    expect(await cancelOrder(prisma, 99999)).toBe('not_found');
  });

  it('returns not_pending for a paid order and keeps it paid', async () => {
    const id = await newOrder('paid');
    expect(await cancelOrder(prisma, id)).toBe('not_pending');
    expect(await statusOf(id)).toBe('paid');
  });

  it('two cancels at the same time: exactly one wins', async () => {
    const id = await newOrder();
    const results = await Promise.all([
      cancelOrder(prisma, id),
      cancelOrder(prisma, id),
    ]);
    expect(results.sort()).toEqual(['cancelled', 'not_pending']);
  });
});
