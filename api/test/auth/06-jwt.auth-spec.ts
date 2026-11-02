import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../utils';
import { PASSWORD, now, register, signJwt } from './utils';

describe('06 · POST /auth/token — a JWT by hand', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const token = async (email: string) =>
    (
      await request(app.getHttpServer())
        .post('/auth/token')
        .send({ email, password: PASSWORD })
        .expect(200)
    ).body;

  const me = (jwt: string) =>
    request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${jwt}`);

  const decode = (part: string) =>
    JSON.parse(Buffer.from(part, 'base64url').toString());

  it('returns an HS256 token with sub, iat and exp = iat + 900', async () => {
    const user = await register(app);
    const body = await token(user.email);

    expect(body).toEqual({ accessToken: expect.any(String), expiresIn: 900 });
    const [header, payload] = body.accessToken.split('.');
    expect(decode(header)).toEqual({ alg: 'HS256', typ: 'JWT' });

    const claims = decode(payload);
    expect(claims.sub).toBe(user.id);
    expect(claims.exp - claims.iat).toBe(900);
    expect(Math.abs(claims.iat - now())).toBeLessThan(5);
  });

  it('the signature is a standard HMAC-SHA256 with JWT_SECRET', async () => {
    const user = await register(app);
    const { accessToken } = await token(user.email);
    const [header, payload] = accessToken.split('.');

    expect(accessToken).toBe(signJwt(decode(payload), decode(header)));
  });

  it('GET /auth/me accepts the Bearer token', async () => {
    const user = await register(app);
    const { accessToken } = await token(user.email);

    const res = await me(accessToken).expect(200);
    expect(res.body).toMatchObject({ id: user.id, email: user.email });
  });

  it('refuses a token with a changed payload', async () => {
    const victim = await register(app);
    const attacker = await register(app);
    const { accessToken } = await token(attacker.email);
    const [header, payload, signature] = accessToken.split('.');

    const forged = Buffer.from(
      JSON.stringify({ ...decode(payload), sub: victim.id }),
    ).toString('base64url');
    await me(`${header}.${forged}.${signature}`).expect(401);
  });

  it('refuses an expired token', async () => {
    const user = await register(app);
    await me(
      signJwt({ sub: user.id, iat: now() - 1000, exp: now() - 100 }),
    ).expect(401);
  });

  it('refuses a token signed with another secret', async () => {
    const user = await register(app);
    const exp = now() + 900;
    await me(
      signJwt({ sub: user.id, iat: now(), exp }, undefined, 'guessed-secret'),
    ).expect(401);
  });

  it('refuses "alg": "none"', async () => {
    const user = await register(app);
    const b64 = (v: object) =>
      Buffer.from(JSON.stringify(v)).toString('base64url');
    const unsigned = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: user.id, iat: now(), exp: now() + 900 })}.`;
    await me(unsigned).expect(401);
  });

  it('refuses garbage', async () => {
    await me('not.a.jwt').expect(401);
    await me('abc').expect(401);
  });

  it('wrong password → 401', async () => {
    const user = await register(app);
    await request(app.getHttpServer())
      .post('/auth/token')
      .send({ email: user.email, password: 'wrong password' })
      .expect(401);
  });
});
