import { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { createTestApp, createTestDb } from '../utils';
import { PASSWORD, getCookie, loggedIn, register } from './utils';

describe('04 · POST /auth/logout', () => {
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

  it('returns 204, deletes the session and clears the cookie', async () => {
    const { user, agent } = await loggedIn(app);
    const res = await agent.post('/auth/logout').expect(204);

    const cleared = getCookie(res, 'sid');
    expect(cleared).toBeDefined();
    expect(
      cleared!.attrs.includes('max-age=0') ||
        cleared!.attrs.some((a) => a.startsWith('expires=thu, 01 jan 1970')),
    ).toBe(true);

    const rows = await db.query('SELECT 1 FROM sessions WHERE user_id = $1', [
      user.id,
    ]);
    expect(rows.rows).toHaveLength(0);
  });

  it('a saved copy of the old cookie no longer works', async () => {
    const user = await register(app);
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: PASSWORD })
      .expect(200);
    const cookie = `sid=${getCookie(res, 'sid')!.value}`;

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookie)
      .expect(204);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookie)
      .expect(401);
  });

  it('returns 401 without a session', async () => {
    await request(app.getHttpServer()).post('/auth/logout').expect(401);
  });
});
