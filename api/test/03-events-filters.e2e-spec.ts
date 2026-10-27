import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils';

describe('03 · GET /events — filters', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('filters by category', async () => {
    const res = await request(app.getHttpServer())
      .get('/events?category=concert')
      .expect(200);

    expect(res.body.total).toBe(8);
    expect(
      res.body.items.every(
        (e: { category: string }) => e.category === 'concert',
      ),
    ).toBe(true);
  });

  it('filters by venue city', async () => {
    const res = await request(app.getHttpServer())
      .get('/events?city=Berlin')
      .expect(200);

    expect(res.body.total).toBe(10);
  });

  it('filters by minimum base price (inclusive)', async () => {
    const res = await request(app.getHttpServer())
      .get('/events?minPrice=100')
      .expect(200);

    expect(res.body.total).toBe(15);
    expect(
      res.body.items.every((e: { basePrice: number }) => e.basePrice >= 100),
    ).toBe(true);
  });

  it('combines filters with each other and with pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/events?category=concert&city=Berlin&limit=1')
      .expect(200);

    expect(res.body.total).toBe(2);
    expect(res.body.items.map((e: { id: number }) => e.id)).toEqual([5]);
  });

  it('returns 400 for an unknown category', async () => {
    await request(app.getHttpServer())
      .get('/events?category=opera')
      .expect(400);
  });

  it('returns 400 for a negative minPrice', async () => {
    await request(app.getHttpServer()).get('/events?minPrice=-5').expect(400);
  });

  it('is not vulnerable to SQL injection', async () => {
    const res = await request(app.getHttpServer())
      .get('/events')
      .query({ city: "Berlin' OR '1'='1" })
      .expect(200);

    expect(res.body.total).toBe(0);
  });
});
