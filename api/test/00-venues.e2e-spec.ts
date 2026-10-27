// Example: the endpoint that already exists. Use it as a template for your own tests and code.
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils';

describe('00 · GET /venues', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns all venues ordered by id', async () => {
    const res = await request(app.getHttpServer()).get('/venues').expect(200);

    expect(res.body).toHaveLength(8);
    expect(res.body[0]).toEqual({
      id: 1,
      name: 'O2 Academy',
      city: 'London',
      capacity: 500,
    });
  });
});
