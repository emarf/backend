# Module 3. NestJS + Postgres: your first API

Build a REST API for the ticket service: list events, show availability, create users,
book and pay for tickets. You write the code in [`api/`](../../api), and e2e tests check
that every endpoint behaves exactly as described below.

The database access is **raw SQL** through the `pg` driver, with no ORM. You already know SQL —
here you learn how it fits into a backend, and later an ORM will not be a black box.

## How to work

```bash
pnpm install          # once, from the repo root
pnpm db:up            # Postgres must be running
pnpm api:dev          # start the API on http://localhost:3000 with auto-reload
pnpm test:api         # run all tests
pnpm test:api 03      # run tests of one task (the file test/03-*.e2e-spec.ts)
```

Tests run against a separate database, `tickets_test`, which is recreated from `db/init`
before every run. Your working database `tickets` is never touched, and the tests can create
users and orders freely.

Workflow for each task:
1. Read the task and the test file for it in `api/test/` — the test is the precise spec.
2. Try the endpoint by hand while you build it: in the browser, `curl`, or Postman / Bruno.
3. Run `pnpm test:api NN` until it is green.

Reference solutions are in [`solutions/03-api/`](../../solutions/03-api). Open them only after
your version passes — then compare approaches.

## What is already there

```
api/src/
  main.ts                    starts the HTTP server
  app.setup.ts               app-wide config, shared by main.ts and the tests
  app.module.ts              the root module: lists all feature modules
  database/database.module.ts  creates the Postgres connection pool
  venues/                    a complete example feature: GET /venues
    venues.module.ts
    venues.controller.ts
    venues.service.ts
```

Read the `venues/` folder first. Every task follows the same pattern.

## NestJS in five ideas

**Module** — a box that groups related code (`EventsModule`, `UsersModule`). The root
`AppModule` imports all of them. A new module must be added to `imports` in `app.module.ts`,
otherwise Nest does not know it exists.

**Controller** — handles HTTP: which URL and method, what comes in (params, query, body),
what goes out. It should be thin and call a service.

**Service (provider)** — the logic and the database queries. It knows nothing about HTTP.

**Dependency injection (DI)** — you never write `new VenuesService()`. You list what a class
needs in its constructor (`constructor(private readonly db: Pool)`), and Nest creates and
passes it. Decorators like `@Injectable()`, `@Controller()`, `@Module()` tell Nest how to wire
everything together.

**Pipes and exceptions** — pipes check and convert input *before* your code runs
(`ParseIntPipe`, `ValidationPipe`); exceptions like `NotFoundException` turn into the right
HTTP status and JSON error body automatically.

The CLI can generate files for you: `pnpm --filter tickets-api exec nest g module events`
(also `controller`, `service`). Or create them by hand, as in `venues/`.

## Rules for all endpoints

- **Always pass values as query parameters**: `db.query('... WHERE id = $1', [id])`.
  Never glue user input into SQL with `${...}` — that is how SQL injection happens.
  Task 03 has a test that tries to break in.
- **JSON uses camelCase**: the database column `starts_at` becomes `startsAt` in the response.
- **Numbers are numbers**: `pg` returns `numeric` and `bigint` as strings (`"60.50"`) to avoid
  precision loss. Convert prices to `number` before returning. For counts, `count(*)::int`
  in SQL is the easiest way.
- **Status codes matter**: 200 OK, 201 Created, 400 Bad Request (invalid input),
  404 Not Found, 409 Conflict (the request is valid but clashes with the current state).

## Tasks

### 01 · `GET /events` — list with pagination

Returns a page of events and the total number of events.

```json
{
  "items": [
    { "id": 27, "title": "Stand-up #27", "category": "standup",
      "startsAt": "2026-03-04T19:00:00.000Z", "basePrice": 60.5, "venueId": 2 }
  ],
  "total": 40
}
```

- Query parameters: `limit` (1–100, default 20) and `offset` (≥ 0, default 0), integers.
- Order: `startsAt`, then `id`.
- Invalid `limit` / `offset` → **400**.

Learn: query parameters arrive as **strings**. Look up `ValidationPipe` with `transform: true`,
`class-validator` decorators and `@Type(() => Number)` from `class-transformer`.
The pipe is configured once, in `app.setup.ts`.

### 02 · `GET /events/:id` — one event with its venue

```json
{
  "id": 7, "title": "Stand-up #7", "category": "standup",
  "startsAt": "2026-05-03T19:00:00.000Z", "basePrice": 40,
  "venue": { "id": 6, "name": "Coliseu", "city": "Lisbon", "capacity": 400 }
}
```

- Unknown id → **404**. Id that is not a number (`/events/abc`) → **400**.

Learn: route params, `ParseIntPipe`, `NotFoundException`. Turning flat SQL rows into nested JSON.

### 03 · `GET /events` — filters

Add optional filters to the same endpoint; they combine with each other and with pagination,
and `total` counts only the matching events.

- `category` — one of `concert | theatre | standup | sport | festival`, otherwise **400**
- `city` — the venue's city
- `minPrice` — `basePrice >= minPrice`, a number ≥ 0, otherwise **400**

Learn: building a `WHERE` clause from optional parts while keeping every value a `$n` parameter.

### 04 · `GET /events/:id/availability` — free seats

```json
{ "eventId": 10, "capacity": 120, "sold": 62, "reserved": 11, "available": 47 }
```

- `sold` — tickets in `paid` orders, `reserved` — tickets in `pending` orders,
  `available = capacity - sold - reserved`.
- Unknown event → **404**.

Learn: your SQL module skills inside an endpoint. One query is enough.

### 05 · `POST /users` — create a user

Body: `{ "email": "...", "name": "...", "city": "..." }`, `city` optional.
Response **201**:

```json
{ "id": 201, "email": "new.user@mail.test", "name": "New User", "city": "Paris",
  "createdAt": "2026-10-24T12:00:00.000Z" }
```

- `email` must be a valid email, `name` a non-empty string (max 100 chars).
  Any field not listed here (for example `isAdmin`) → **400**.
- Missing `city` → saved and returned as `null`.
- Email already taken → **409**.

Learn: DTO classes with `class-validator`, the `whitelist` / `forbidNonWhitelisted` options
of `ValidationPipe` (think about why accepting unknown fields is dangerous),
`INSERT ... RETURNING`, and catching a unique-constraint error from Postgres
(look up error code `23505`).

### 06 · `GET /users/:id/orders` — orders with tickets

```json
[
  {
    "id": 376, "status": "paid", "createdAt": "2026-06-26T15:59:00.000Z", "total": 522,
    "tickets": [ { "id": 101, "eventId": 12, "seatNo": 7, "price": 174 } ]
  }
]
```

- All orders of the user, newest first (then by id, descending). Tickets inside an order by id.
- `total` — the sum of the order's ticket prices.
- User without orders → `[]`. Unknown user → **404** (note: these are different cases).

Learn: a one-to-many relation in JSON. SQL returns one flat row per ticket — you decide
how to turn that into orders with nested tickets.

### 07 · `POST /orders` — book tickets ⭐

Body: `{ "userId": 1, "eventId": 40, "quantity": 2 }`. Creates a `pending` order with
`quantity` tickets. Response **201**:

```json
{
  "id": 1001, "userId": 1, "status": "pending", "total": 120,
  "tickets": [
    { "id": 2438, "eventId": 40, "seatNo": 46, "price": 60 },
    { "id": 2439, "eventId": 40, "seatNo": 47, "price": 60 }
  ]
}
```

- `quantity` — an integer from 1 to 10, otherwise **400**.
- Ticket price = the event's `basePrice`.
- Seat numbers continue after the highest seat number already used for this event.
- Unknown user or event → **404**.
- Not enough available seats (see task 04) → **409**, and nothing is saved.
- **All or nothing**: the order and its tickets must be saved in one transaction. If anything
  fails halfway, no order without tickets may remain.

Learn: transactions with `pg` — `BEGIN` / `COMMIT` / `ROLLBACK`, and why a transaction needs
**one** client taken from the pool (`pool.connect()`) and released at the end.
Think about what happens if two people book the last seats at the same moment — we will
come back to that in the transactions module.

### 08 · `POST /orders/:id/pay` — pay for an order

Moves a `pending` order to `paid`. Response **200**: `{ "id": 1001, "status": "paid" }`.

- Order is not `pending` (already paid, cancelled, refunded) → **409**, status unchanged.
- Unknown order → **404**.

Learn: why `POST` here answers 200 and not 201 (nothing new is created), `@HttpCode`,
and checking the status inside the `UPDATE` itself (`WHERE status = 'pending'`) instead of
"read, check in JS, then write" — think about what can happen between the read and the write.
