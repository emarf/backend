import { CookieOptions } from 'express';

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// a valid "salt:hash" that matches no password; only there to burn the same time
export const DUMMY_HASH = '00000000000000000000000000000000:' + '0'.repeat(128);

export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
} satisfies CookieOptions;

export const REFRESH_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  path: '/auth/refresh',
  maxAge: REFRESH_TOKEN_TTL_MS,
} satisfies CookieOptions;
