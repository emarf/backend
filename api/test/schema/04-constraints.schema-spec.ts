import { Pool } from 'pg';
import { pgErrorCode } from './helpers';

// 23514 = check_violation, 23505 = unique_violation
describe('04 · Constraints written by hand', () => {
  let db: Pool;

  beforeAll(() => {
    db = new Pool({ connectionString: process.env.DATABASE_URL });
  });

  afterAll(async () => {
    await db.end();
  });

  const insertTicket = (seatNo: number, price: number) =>
    db.query(
      'INSERT INTO tickets (order_id, event_id, seat_no, price) VALUES (1, 1, $1, $2)',
      [seatNo, price],
    );

  it.each([0, -5])('rejects a ticket with seat_no = %i', async (seatNo) => {
    expect(await pgErrorCode(insertTicket(seatNo, 50))).toBe('23514');
  });

  it('rejects a ticket with a negative price', async () => {
    expect(await pgErrorCode(insertTicket(9001, -1))).toBe('23514');
  });

  it('rejects an email that differs from an existing one only by case', async () => {
    const code = await pgErrorCode(
      db.query(
        "INSERT INTO users (email, name, created_at) VALUES ('User1@Mail.TEST', 'Copy', now())",
      ),
    );
    expect(code).toBe('23505');
  });
});
