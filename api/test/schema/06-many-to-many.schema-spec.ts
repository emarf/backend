import { Pool } from 'pg';
import { createPrisma, pgErrorCode } from './helpers';

describe('06 · Many-to-many: events and artists', () => {
  let db: Pool;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;
  let artistId: number;

  beforeAll(async () => {
    db = new Pool({ connectionString: process.env.DATABASE_URL });
    prisma = createPrisma();
    const res = await db.query(
      "INSERT INTO artists (name) VALUES ('The Test Band') RETURNING id",
    );
    artistId = res.rows[0].id;
    await db.query(
      'INSERT INTO event_artists (event_id, artist_id) VALUES (1, $1), (2, $1)',
      [artistId],
    );
  });

  afterAll(async () => {
    await db.end();
    await prisma?.$disconnect();
  });

  it('one artist can play several events', async () => {
    const res = await db.query(
      'SELECT event_id FROM event_artists WHERE artist_id = $1 ORDER BY 1',
      [artistId],
    );
    expect(res.rows.map((r) => r.event_id)).toEqual([1, 2]);
  });

  it('the same artist cannot be added to the same event twice', async () => {
    const code = await pgErrorCode(
      db.query(
        'INSERT INTO event_artists (event_id, artist_id) VALUES (1, $1)',
        [artistId],
      ),
    );
    expect(code).toBe('23505');
  });

  it('artist names are unique', async () => {
    expect(
      await pgErrorCode(
        db.query("INSERT INTO artists (name) VALUES ('The Test Band')"),
      ),
    ).toBe('23505');
  });

  it('links point only to existing events and artists', async () => {
    const code = await pgErrorCode(
      db.query(
        'INSERT INTO event_artists (event_id, artist_id) VALUES (99999, $1)',
        [artistId],
      ),
    );
    expect(code).toBe('23503');
  });

  it('deleting an event removes its links, deleting a booked artist is refused', async () => {
    const event = await db.query(
      "INSERT INTO events (venue_id, title, category, starts_at, base_price) VALUES (1, 'Temp', 'concert', now(), 10) RETURNING id",
    );
    const eventId: number = event.rows[0].id;
    await db.query(
      'INSERT INTO event_artists (event_id, artist_id) VALUES ($1, $2)',
      [eventId, artistId],
    );

    await db.query('DELETE FROM events WHERE id = $1', [eventId]);
    const left = await db.query(
      'SELECT 1 FROM event_artists WHERE event_id = $1',
      [eventId],
    );
    expect(left.rows).toHaveLength(0);

    expect(
      await pgErrorCode(
        db.query('DELETE FROM artists WHERE id = $1', [artistId]),
      ),
    ).toBe('23503');
  });

  it('Prisma can load an event with its artists', async () => {
    const event = await prisma.event.findUnique({
      where: { id: 1 },
      include: { artists: { include: { artist: true } } },
    });
    expect(
      event.artists.map(
        (link: { artist: { name: string } }) => link.artist.name,
      ),
    ).toContain('The Test Band');
  });
});
