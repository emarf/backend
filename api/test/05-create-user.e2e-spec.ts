import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils';

describe('05 · POST /users — create a user with validation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a user and returns 201 with the created user', async () => {
    const res = await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'new.user@mail.test', name: 'New User', city: 'Paris' })
      .expect(201);

    expect(res.body).toEqual({
      id: expect.any(Number),
      email: 'new.user@mail.test',
      name: 'New User',
      city: 'Paris',
      createdAt: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(res.body.createdAt))).toBe(false);
  });

  it('city is optional and becomes null', async () => {
    const res = await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'no.city@mail.test', name: 'No City' })
      .expect(201);

    expect(res.body.city).toBeNull();
  });

  it('returns 409 when the email is already taken', async () => {
    const res = await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'user1@mail.test', name: 'Duplicate' })
      .expect(409);

    expect(res.body.statusCode).toBe(409);
  });

  it.each([
    ['an invalid email', { email: 'not-an-email', name: 'Bad Email' }],
    ['a missing email', { name: 'No Email' }],
    ['a missing name', { email: 'no.name@mail.test' }],
    ['an empty name', { email: 'empty.name@mail.test', name: '' }],
    ['a name that is not a string', { email: 'num.name@mail.test', name: 42 }],
    ['an unknown field', { email: 'hacker@mail.test', name: 'Hacker', isAdmin: true }],
  ])('returns 400 for %s', async (_, body) => {
    await request(app.getHttpServer()).post('/users').send(body).expect(400);
  });
});
