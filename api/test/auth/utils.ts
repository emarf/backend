import { createHmac, randomBytes } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export const PASSWORD = 'correct horse';

// Every test gets its own user, so tests never depend on each other's data
export function uniqueEmail(prefix = 'user'): string {
  return `${prefix}.${randomBytes(4).toString('hex')}@mail.test`;
}

export async function register(
  app: INestApplication,
  email = uniqueEmail(),
): Promise<{ id: number; email: string }> {
  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, name: 'Test User', password: PASSWORD })
    .expect(201);
  return { id: res.body.id, email };
}

// Registers a new user and logs in; the agent keeps the cookies like a browser does
export async function loggedIn(app: INestApplication) {
  const user = await register(app);
  const agent = request.agent(app.getHttpServer());
  await agent
    .post('/auth/login')
    .send({ email: user.email, password: PASSWORD })
    .expect(200);
  return { user, agent };
}

// Finds one cookie in the Set-Cookie headers: its value and its attributes, lowercased
export function getCookie(res: request.Response, name: string) {
  const raw = ([] as string[])
    .concat(res.headers['set-cookie'] ?? [])
    .find((c) => c.startsWith(`${name}=`));
  if (!raw) return undefined;
  const [pair, ...attrs] = raw.split(';').map((p) => p.trim());
  return {
    value: decodeURIComponent(pair.slice(name.length + 1)),
    attrs: attrs.map((a) => a.toLowerCase()),
  };
}

const b64 = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

// Builds a JWT the way the API must build it, so tests can make valid, expired and forged ones
export function signJwt(
  payload: object,
  header: object = { alg: 'HS256', typ: 'JWT' },
  secret = process.env.JWT_SECRET!,
): string {
  const data = `${b64(header)}.${b64(payload)}`;
  const signature = createHmac('sha256', secret)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

export const now = () => Math.floor(Date.now() / 1000);
