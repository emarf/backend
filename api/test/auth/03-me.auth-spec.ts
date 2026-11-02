import { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { createTestApp, createTestDb } from '../utils';
import { loggedIn } from './utils';

describe('03 · GET /auth/me — the auth guard', () => {
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

  it('returns the logged-in user', async () => {
    const { user, agent } = await loggedIn(app);
    const res = await agent.get('/auth/me').expect(200);

    expect(res.body).toEqual({
      id: user.id,
      email: user.email,
      name: 'Test User',
      city: null,
      createdAt: expect.any(String),
    });
  });

  it('returns 401 without a cookie', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('returns 401 for a token the server never issued', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', 'sid=made-up-token-made-up-token-made-up-token')
      .expect(401);
  });

  it('returns 401 when the session has expired', async () => {
    const { user, agent } = await loggedIn(app);
    await db.query(
      "UPDATE sessions SET expires_at = now() - interval '1 minute' WHERE user_id = $1",
      [user.id],
    );
    await agent.get('/auth/me').expect(401);
  });
});
