import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../utils';
import { loggedIn } from './utils';

const FRONTEND = 'http://localhost:5173';
const EVIL = 'https://evil.test';

describe('09 · CORS and CSRF', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const preflight = (origin: string) =>
    request(app.getHttpServer())
      .options('/auth/me')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'GET');

  it('CORS: the frontend origin may read responses, with cookies', async () => {
    const res = await preflight(FRONTEND);
    expect(res.status).toBeLessThan(300);
    expect(res.headers['access-control-allow-origin']).toBe(FRONTEND);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('CORS: any other origin gets no Access-Control-Allow-Origin', async () => {
    const res = await preflight(EVIL);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('CSRF: a POST from another site is refused before it does anything', async () => {
    const { agent } = await loggedIn(app);

    await agent.post('/auth/logout').set('Origin', EVIL).expect(403);
    await agent.get('/auth/me').expect(200);
  });

  it('CSRF: the frontend and requests without Origin still work', async () => {
    const a = await loggedIn(app);
    await a.agent.post('/auth/logout').set('Origin', FRONTEND).expect(204);

    const b = await loggedIn(app);
    await b.agent.post('/auth/logout').expect(204);
  });
});
