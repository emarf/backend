import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils';

describe('01 · GET /events — list with pagination', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the first 20 events and the total count by default', async () => {
    const res = await request(app.getHttpServer()).get('/events').expect(200);

    expect(res.body.total).toBe(40);
    expect(res.body.items).toHaveLength(20);
  });

  it('orders events by start time, then by id', async () => {
    const res = await request(app.getHttpServer()).get('/events').expect(200);

    expect(res.body.items.map((e: { id: number }) => e.id)).toEqual([
      27, 1, 28, 2, 29, 3, 30, 4, 31, 5, 32, 6, 33, 7, 34, 8, 35, 9, 36, 10,
    ]);
  });

  it('returns events in camelCase with numbers as numbers', async () => {
    const res = await request(app.getHttpServer()).get('/events').expect(200);

    expect(res.body.items[0]).toEqual({
      id: 27,
      title: 'Stand-up #27',
      category: 'standup',
      startsAt: '2026-03-04T19:00:00.000Z',
      basePrice: 60.5,
      venueId: 2,
    });
  });

  it('supports limit and offset', async () => {
    const res = await request(app.getHttpServer())
      .get('/events?limit=5&offset=5')
      .expect(200);

    expect(res.body.total).toBe(40);
    expect(res.body.items.map((e: { id: number }) => e.id)).toEqual([
      3, 30, 4, 31, 5,
    ]);
  });

  it('returns an empty page past the end', async () => {
    const res = await request(app.getHttpServer())
      .get('/events?offset=100')
      .expect(200);

    expect(res.body).toEqual({ items: [], total: 40 });
  });

  it.each(['limit=0', 'limit=101', 'limit=abc', 'offset=-1', 'offset=1.5'])(
    'rejects invalid pagination: %s → 400',
    async (query) => {
      await request(app.getHttpServer()).get(`/events?${query}`).expect(400);
    },
  );
});
