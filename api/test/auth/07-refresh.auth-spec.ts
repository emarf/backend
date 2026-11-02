import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../utils';
import { PASSWORD, getCookie, register } from './utils';

describe('07 · POST /auth/refresh — rotation and reuse detection', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function issue() {
    const user = await register(app);
    const res = await request(app.getHttpServer())
      .post('/auth/token')
      .send({ email: user.email, password: PASSWORD })
      .expect(200);
    return { user, refresh: getCookie(res, 'refresh') };
  }

  const refresh = (token: string) =>
    request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', `refresh=${token}`);

  it('POST /auth/token sets an HttpOnly refresh cookie limited to /auth/refresh', async () => {
    const { refresh: cookie } = await issue();

    expect(cookie).toBeDefined();
    expect(cookie!.value.length).toBeGreaterThanOrEqual(32);
    expect(cookie!.attrs).toEqual(
      expect.arrayContaining([
        'httponly',
        'path=/auth/refresh',
        `max-age=${30 * 24 * 60 * 60}`,
      ]),
    );
  });

  it('gives a new access token and a new refresh token', async () => {
    const { user, refresh: first } = await issue();
    const res = await refresh(first!.value).expect(200);

    expect(res.body).toEqual({
      accessToken: expect.any(String),
      expiresIn: 900,
    });
    const second = getCookie(res, 'refresh');
    expect(second).toBeDefined();
    expect(second!.value).not.toBe(first!.value);

    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${res.body.accessToken}`)
      .expect(200);
    expect(me.body.id).toBe(user.id);
  });

  it('every refresh token works once: the chain keeps going', async () => {
    const { refresh: first } = await issue();
    const second = getCookie(
      await refresh(first!.value).expect(200),
      'refresh',
    );
    const third = getCookie(
      await refresh(second!.value).expect(200),
      'refresh',
    );
    expect(third).toBeDefined();
  });

  it('a reused token is refused and revokes the whole family', async () => {
    const { refresh: stolen } = await issue();
    const fresh = getCookie(
      await refresh(stolen!.value).expect(200),
      'refresh',
    );

    await refresh(stolen!.value).expect(401);
    await refresh(fresh!.value).expect(401);
  });

  it('refuses a missing or unknown token', async () => {
    await request(app.getHttpServer()).post('/auth/refresh').expect(401);
    await refresh('made-up-token-made-up-token-made-up-token').expect(401);
  });
});
