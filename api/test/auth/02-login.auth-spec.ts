import { createHash } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { createTestApp, createTestDb } from '../utils';
import { PASSWORD, getCookie, register } from './utils';

describe('02 · POST /auth/login — session cookie', () => {
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

  const login = (email: string, password: string) =>
    request(app.getHttpServer()).post('/auth/login').send({ email, password });

  it('returns 200 with the user and an HttpOnly session cookie', async () => {
    const user = await register(app);
    const res = await login(user.email, PASSWORD).expect(200);

    expect(res.body).toMatchObject({ id: user.id, email: user.email });
    expect(res.body).not.toHaveProperty('passwordHash');

    const sid = getCookie(res, 'sid');
    expect(sid).toBeDefined();
    expect(sid!.value.length).toBeGreaterThanOrEqual(32);
    expect(sid!.attrs).toEqual(
      expect.arrayContaining([
        'httponly',
        'samesite=lax',
        'path=/',
        'max-age=604800',
      ]),
    );
  });

  it('stores a session row for the user, with only a hash of the token', async () => {
    const user = await register(app);
    const res = await login(user.email, PASSWORD).expect(200);
    const token = getCookie(res, 'sid')!.value;

    const rows = (
      await db.query(
        "SELECT *, expires_at > now() + interval '6 days' AS long_enough FROM sessions WHERE user_id = $1",
        [user.id],
      )
    ).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].long_enough).toBe(true);

    const stored = JSON.stringify(rows);
    expect(stored).not.toContain(token);
    const sha = createHash('sha256').update(token);
    expect(
      stored.includes(sha.copy().digest('hex')) ||
        stored.includes(sha.copy().digest('base64url')),
    ).toBe(true);
  });

  it('gives the same 401 for a wrong password and an unknown email', async () => {
    const user = await register(app);
    const wrong = await login(user.email, 'wrong password').expect(401);
    const unknown = await login('nobody.here@mail.test', PASSWORD).expect(401);

    expect(wrong.body.message).toBe(unknown.body.message);
    expect(getCookie(wrong, 'sid')).toBeUndefined();
  });

  it('refuses users who have no password (created before this module)', async () => {
    const seeded = await db.query(
      'SELECT email FROM users WHERE password_hash IS NULL LIMIT 1',
    );
    await login(seeded.rows[0].email, PASSWORD).expect(401);
  });

  it('deleting a user deletes their sessions', async () => {
    const user = await register(app);
    await login(user.email, PASSWORD).expect(200);

    await db.query('DELETE FROM users WHERE id = $1', [user.id]);
    const left = await db.query('SELECT 1 FROM sessions WHERE user_id = $1', [
      user.id,
    ]);
    expect(left.rows).toHaveLength(0);
  });
});
