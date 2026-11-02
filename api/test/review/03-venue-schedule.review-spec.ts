import { Pool } from 'pg';
import { createPrisma } from '../schema/helpers';
import { venueSchedule } from '../../../exercises/review-1/03-venue-schedule';

describe('Review 03 · A venue and its events in one Prisma query', () => {
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

  it('returns null for a venue that does not exist', async () => {
    expect(await venueSchedule(prisma, 99999)).toBeNull();
  });

  it('returns the venue with its events sorted by start, then id', async () => {
    const venue = await db.query('SELECT name, city FROM venues WHERE id = 1');
    const events = await db.query(
      `SELECT id, title, starts_at AS "startsAt", base_price::float AS "basePrice"
       FROM events WHERE venue_id = 1 ORDER BY starts_at, id`,
    );

    expect(await venueSchedule(prisma, 1)).toEqual({
      ...venue.rows[0],
      events: events.rows,
    });
  });

  it('breaks ties on the same start time by id', async () => {
    const startsAt = new Date('2030-01-01T20:00:00Z');
    const ids: number[] = [];
    for (const title of ['Tie B', 'Tie A']) {
      const res = await db.query(
        "INSERT INTO events (venue_id, title, category, starts_at, base_price) VALUES (2, $1, 'concert', $2, 10) RETURNING id",
        [title, startsAt],
      );
      ids.push(res.rows[0].id);
    }

    // typed loosely so the test compiles before the task is done
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schedule: any = await venueSchedule(prisma, 2);
    const tied = schedule.events
      .filter(
        (e: { startsAt: Date }) => e.startsAt.getTime() === startsAt.getTime(),
      )
      .map((e: { id: number }) => e.id);
    expect(tied).toEqual(ids);
  });
});
