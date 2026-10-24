import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils';

describe('02 · GET /events/:id — one event with its venue', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the event with the venue nested inside', async () => {
    const res = await request(app.getHttpServer()).get('/events/7').expect(200);

    expect(res.body).toEqual({
      id: 7,
      title: 'Stand-up #7',
      category: 'standup',
      startsAt: '2026-05-03T19:00:00.000Z',
      basePrice: 40,
      venue: { id: 6, name: 'Coliseu', city: 'Lisbon', capacity: 400 },
    });
  });

  it('returns 404 for an event that does not exist', async () => {
    const res = await request(app.getHttpServer()).get('/events/9999').expect(404);

    expect(res.body.statusCode).toBe(404);
  });

  it('returns 400 when the id is not a number', async () => {
    await request(app.getHttpServer()).get('/events/abc').expect(400);
  });
});
