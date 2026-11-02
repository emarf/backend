import { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { createTestApp, createTestDb } from '../utils';
import { PASSWORD, uniqueEmail } from './utils';

describe('01 · POST /auth/register — passwords', () => {
  let app: INestApplication;
  let db: Pool;

  beforeAll(async () => {
    app = await createTestApp();
    db = createTestDb();
  });

  afterAll(async () => {
    await app.close();
    await db.end();
  });

  const registerAs = (email: string, password = PASSWORD) =>
    request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, name: 'Ann', password });

  const hashOf = async (id: number): Promise<string> =>
    (await db.query('SELECT password_hash FROM users WHERE id = $1', [id]))
      .rows[0].password_hash;

  it('returns 201 with the user and nothing about the password', async () => {
    const email = uniqueEmail('ann');
    const res = await registerAs(email).expect(201);

    expect(res.body).toEqual({
      id: expect.any(Number),
      email,
      name: 'Ann',
      city: null,
      createdAt: expect.any(String),
    });
  });

  it('stores a hash, not the password', async () => {
    const res = await registerAs(uniqueEmail()).expect(201);
    const hash = await hashOf(res.body.id);

    expect(typeof hash).toBe('string');
    expect(hash).not.toContain(PASSWORD);
    expect(hash.length).toBeGreaterThanOrEqual(40);
  });

  it('the same password gives two different hashes (salt)', async () => {
    const a = await registerAs(uniqueEmail()).expect(201);
    const b = await registerAs(uniqueEmail()).expect(201);

    expect(await hashOf(a.body.id)).not.toBe(await hashOf(b.body.id));
  });

  it.each([
    ['too short', 'short'],
    ['too long', 'x'.repeat(73)],
  ])('refuses a password that is %s with 400', async (_, password) => {
    await registerAs(uniqueEmail(), password).expect(400);
  });

  it('refuses a taken email with 409', async () => {
    const email = uniqueEmail();
    await registerAs(email).expect(201);
    await registerAs(email.toUpperCase()).expect(409);
  });
});
