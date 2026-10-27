import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils';

describe('04 · GET /events/:id/availability — free seats', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('counts sold (paid), reserved (pending) and available seats', async () => {
    const res = await request(app.getHttpServer())
      .get('/events/10/availability')
      .expect(200);

    expect(res.body).toEqual({
      eventId: 10,
      capacity: 120,
      sold: 62,
      reserved: 11,
      available: 47,
    });
  });

  it('returns 404 for an event that does not exist', async () => {
    await request(app.getHttpServer())
      .get('/events/9999/availability')
      .expect(404);
  });
});
