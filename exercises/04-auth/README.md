# Module 4. Authentication and security

Until now anyone could do anything: create an order for any `userId`, read anyone's orders.
In this module users get passwords, log in, and the API starts to know *who* is calling.
Then you attack your own API — SQL injection, a forged token, a request from a foreign site —
and close each hole.

Most of this is done with Node's built-in `node:crypto`, on purpose. In a real project you would
take `argon2` or `bcrypt` for passwords and `@nestjs/jwt` or `jose` for tokens — but after writing
a JWT by hand once, those libraries are no longer magic, and that is what interviews ask about.

## How to work

```bash
pnpm test:auth        # all module 4 checks
pnpm test:auth 03     # one task (api/test/auth/03-*.auth-spec.ts)
pnpm test:api         # module 3 tests — they must stay green
pnpm test:schema      # module 2 tests — the same
```

Schema changes go through Prisma migrations, as in module 2 (`pnpm prisma migrate dev --name ...`).
Tests build `tickets_test` from `db/init` plus your migrations, so new tables appear there too.

Workflow for each task: read the task and its test file in `api/test/auth/`, write the code, run
`pnpm test:auth NN`. Later tasks use the endpoints of earlier ones, so go in order.

Reference solutions are on the `solutions` branch, in `solutions/04-auth/`.

## What is already there

```
api/src/search/         GET /search?q= — a search that is vulnerable to SQL injection (task 08)
cookie-parser           installed, not switched on yet (task 02)
api/test/auth/utils.ts  helpers the tests use to register and log in
```

## Authentication in six ideas

**Authentication vs authorization.** Authentication answers *who are you* (login → 401 when it
fails). Authorization answers *are you allowed to do this* (someone else's order → 403 or 404).

**Never store a password, store a hash.** A hash is one-way: from the hash you cannot get the
password back, but you can check a guess. Two more rules make it work:
- *salt* — random bytes mixed into every hash, stored next to it. Without salt, two users with
  the password `qwerty123` have the same hash, and one precomputed table cracks every database.
- *slow* — a password hash must be deliberately expensive (`scrypt`, `bcrypt`, `argon2`), so an
  attacker with a stolen database can try thousands of guesses per second, not billions. That is
  why `sha256(password)` is wrong for passwords.

**Session vs token.** After login the server must recognise the user on every next request.
- *Session*: the server creates a random id, stores it in the database, and gives it to the
  browser in a cookie. Every request → look up the id. Logout = delete the row, instantly.
- *JWT*: the server signs `{ sub: userId, exp }` with a secret and gives it to the client. Every
  request → check the signature, no database. But a signed token stays valid until `exp`; logout
  cannot take it back. Hence short-lived access tokens + long-lived refresh tokens.

**Where the token lives.** `localStorage` is readable by any JavaScript on the page, so one XSS
steals it. An `HttpOnly` cookie is invisible to JavaScript and is sent by the browser itself. The
price: the browser also sends it with requests started by *other* sites — that is CSRF, and
`SameSite` plus an `Origin` check are the answer (task 09).

**JWT is not encryption.** `header.payload.signature`, each part base64url. Anyone can *read* the
payload; only the holder of the secret can *produce* a valid signature. Never put secrets in it.

**Error messages leak.** "No user with this email" vs "Wrong password" tells an attacker which
emails are registered. Login answers the same 401 for both.

## Tasks

### 01 · Passwords: `POST /auth/register`

```json
{ "email": "ann@mail.test", "name": "Ann", "password": "correct horse" }
```

- Response **201** with the same user shape as `POST /users` (`id, email, name, city, createdAt`).
  Neither the password nor its hash ever appears in a response.
- New nullable column `users.password_hash` (`passwordHash` in Prisma). Nullable, because the
  existing users have no password — they simply cannot log in.
- Password: string, 8–72 characters, otherwise **400**. Email taken → **409**.
- Hash with `scrypt` from `node:crypto` and a random 16-byte salt per user. Store both in the
  one column, for example `salt:hash` in hex.

Learn: `randomBytes`, `scrypt` (promisify it, or use `scryptSync` for now), why the salt is not
secret, and what `timingSafeEqual` is for (you need it in task 02).

### 02 · Login and a session cookie: `POST /auth/login`

```json
{ "email": "ann@mail.test", "password": "correct horse" }
```

- Success → **200** with the user (same shape) and a cookie
  `sid=<random>; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800` (7 days).
- Wrong password, unknown email, or a user without a password → **401** with the same message.
- New table `sessions`: one row per login, with `user_id` and `expires_at` (both used by tests).
  Deleting a user deletes their sessions.
- The cookie value is a random token (`randomBytes(32)`, as base64url). The database stores only
  the `sha256` of that string (hex or base64url) — whoever steals a backup must not be able to log
  in as everyone.
- Switch on `cookie-parser` in `app.setup.ts`, so `req.cookies.sid` works.

Learn: `res.cookie(...)` with `@Res({ passthrough: true })`, and the interview question: *why is
a fast `sha256` fine for the session token but not for the password?*

### 03 · Who am I: `GET /auth/me`

- With a valid session → **200** with the user. No cookie, an unknown token, or an expired
  session (`expires_at` in the past) → **401**.
- Write it as a **guard** (`CanActivate`) that finds the user and puts it on the request, plus a
  `@CurrentUser()` param decorator to read it in the controller. Every protected endpoint in the
  next tasks is just `@UseGuards(AuthGuard)`.

### 04 · Logout: `POST /auth/logout`

- **204**. Deletes the session row and clears the cookie (`Max-Age=0`).
- The old cookie value no longer works anywhere, even if someone saved it.
- Without a session → **401**.

### 05 · Authorization: `GET /me/orders` and `GET /me/orders/:id`

- `GET /me/orders` → the logged-in user's orders, same shape as `GET /users/:id/orders`.
- `GET /me/orders/:id` → one of *their* orders. Someone else's order → **404**, exactly like an
  order that does not exist.

Learn: IDOR (insecure direct object reference) — the most common real-world API bug. Answer for
yourself: why 404 and not 403 here? And what is wrong with `GET /users/:id/orders` from module 3?

### 06 · A JWT by hand: `POST /auth/token`

- Same body as login. **200** `{ "accessToken": "...", "expiresIn": 900 }`.
- HS256: header `{"alg":"HS256","typ":"JWT"}`, payload `{ sub, iat, exp }` with `sub` = user id
  and `exp = iat + 900` (seconds). Signature = HMAC-SHA256 of `header.payload` with
  `process.env.JWT_SECRET` (the tests set it; fall back to a dev value).
- `AuthGuard` now also accepts `Authorization: Bearer <token>`: a valid signature and `exp` in
  the future → the user. A changed payload, an expired token, `"alg":"none"` → **401**.

Learn: `createHmac`, `Buffer.toString('base64url')`, why the server must never trust the `alg` from
the token header, and why `JSON.parse` of the payload comes only *after* the signature check.

### 07 · Refresh tokens with rotation ⭐

- `POST /auth/token` also sets a cookie `refresh=<random>; HttpOnly; Path=/auth/refresh`, valid
  30 days. Stored hashed, like sessions.
- `POST /auth/refresh` (cookie only, no body) → **200** with a new `accessToken` and a **new**
  `refresh` cookie. The old refresh token stops working — every token works exactly once.
- If an already used refresh token comes back, someone has copied it. Answer **401** and revoke
  *all* refresh tokens of that user, including the newest one.

Learn: rotation and reuse detection — why the thief and the real user cannot both keep using one
refresh token, and why `Path=/auth/refresh` keeps the cookie out of every other request.

### 08 · SQL injection: break it, then fix it

`GET /search?q=stand` searches event titles. Read `api/src/search/search.service.ts` — the query
glues `q` into the SQL string.

1. **Break it.** Find a `q` that makes the endpoint return the email and password hash of every
   user. Put it into `exercises/04-auth/08-payload.txt` (one line, the raw value, not URL-encoded).
   The test checks that your payload really leaks the users from the vulnerable query.
2. **Fix it.** Change the service so the same request returns nothing it should not. Normal
   searches keep working, and a `'` in `q` is just a character, not a 500.

Learn: `UNION SELECT`, why the column count and types must match, `--` comments, and why the
fix is a query parameter and not "escaping quotes".

### 09 · CORS and CSRF

The React app will run on `http://localhost:5173`.

- **CORS**: a preflight (`OPTIONS`) from `http://localhost:5173` gets
  `Access-Control-Allow-Origin: http://localhost:5173` and `Access-Control-Allow-Credentials: true`.
  Any other origin gets no `Access-Control-Allow-Origin` at all.
- **CSRF**: a `POST` that carries an `Origin` header from any other site → **403**, before any
  work is done. The test logs in, then sends `POST /auth/logout` with `Origin: https://evil.test`
  and checks that the session survived. Requests without `Origin` (curl, server-to-server) pass.

Learn: CORS does not protect the server — it only decides whether the *browser* lets a page read
the response. The request itself still arrives, which is why CSRF needs its own check.
