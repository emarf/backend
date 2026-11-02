import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { createTestApp, createTestDb } from '../utils';

const PAYLOAD_FILE = join(
  __dirname,
  '..',
  '..',
  '..',
  'exercises',
  '04-auth',
  '08-payload.txt',
);

// The query exactly as it was before the fix, so the payload can be tried against it
const vulnerable = (q: string) =>
  `select id, title from events where title ilike '%${q}%' order by id`;

describe('08 · SQL injection: break it, then fix it', () => {
  let app: INestApplication;
  let db: Pool;
  let payload: string;
  let someEmail: string;

  beforeAll(async () => {
    app = await createTestApp();
    db = createTestDb();
    payload = readFileSync(PAYLOAD_FILE, 'utf8').trim();
    someEmail = (await db.query('SELECT email FROM users ORDER BY id LIMIT 1'))
      .rows[0].email;
  });

  afterAll(async () => {
    await app.close();
    await db.end();
  });

  it('break it: the payload leaks user emails from the vulnerable query', async () => {
    if (!payload) {
      throw new Error('Put your payload into exercises/04-auth/08-payload.txt');
    }
    const { rows } = await db.query(vulnerable(payload));
    expect(JSON.stringify(rows)).toContain(someEmail);
  });

  it('fix it: the same payload leaks nothing through the API', async () => {
    const res = await request(app.getHttpServer())
      .get('/search')
      .query({ q: payload || "x' union select id, email from users --" })
      .expect(200);
    expect(JSON.stringify(res.body)).not.toContain('@');
  });

  it('a quote is just a character', async () => {
    const res = await request(app.getHttpServer())
      .get('/search')
      .query({ q: "O'Brien" })
      .expect(200);
    expect(res.body).toEqual([]);
  });

  it('normal search still works', async () => {
    const res = await request(app.getHttpServer())
      .get('/search')
      .query({ q: 'stand' })
      .expect(200);
    const expected = await db.query(
      "SELECT id, title FROM events WHERE title ILIKE '%stand%' ORDER BY id",
    );
    expect(res.body).toEqual(expected.rows);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
