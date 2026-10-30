# Module 2. Schema design, migrations and Prisma

In module 3 you wrote SQL by hand: queries in strings that nothing checks, row types written
by hand, `parseFloat` for every price, `starts_at` → `startsAt` by hand. Now you add an ORM —
Prisma — to the same API and learn to change the database schema safely with migrations.

You do not start from scratch. The database already exists and has data, so the first tasks
teach what real teams do all the time: put an ORM and migrations on top of an existing database.

## How to work

```bash
pnpm db:up            # Postgres must be running
pnpm prisma <cmd>     # any Prisma CLI command, runs inside api/ (prisma db pull, prisma migrate dev, ...)
pnpm db:migrate       # bring your working database up to date with the migrations
pnpm test:schema      # run all module 2 checks
pnpm test:schema 04   # run the checks of one task (api/test/schema/04-*.schema-spec.ts)
pnpm test:api         # module 3 tests — they must stay green the whole time
```

The tests build `tickets_test` the same way your working database is built: `db/init` first,
then your migrations on top (`tools/migrate.ts`). So a migration that works on your database
also works in the tests.

Workflow for each task: read the task and its test file in `api/test/schema/`, make the
change, run `pnpm test:schema NN` and `pnpm test:api`.

Reference solutions are in [`solutions/02-schema/`](../../solutions/02-schema). Open them only
after your version passes.

## What is already there

```
api/prisma.config.ts      where the schema and migrations live, and the database URL
api/prisma/schema.prisma  the generator and the datasource — no models yet (task 01)
tools/migrate.ts          pnpm db:migrate: applies the migrations to a database built from db/init
```

## Schema design in six ideas

**Primary key** — the column that identifies a row: `id serial PRIMARY KEY`. It never changes and
never repeats. Sometimes a pair of columns is the key: a link "event 1 ↔ artist 5" is identified
by both ids together (task 06).

**Foreign key** — `orders.user_id REFERENCES users (id)`: the database refuses an order for a user
that does not exist. Your JS code can have bugs; the foreign key cannot be forgotten.

**Constraints** — `NOT NULL`, `UNIQUE`, `CHECK (capacity > 0)`. Validation in a DTO protects one
endpoint. A constraint protects the data from every endpoint, script, migration and colleague
with `psql`. Keep both: the DTO gives a friendly 400, the constraint is the last line of defence.

**Normalization** — every fact is stored in one place. The city of an event is not a column of
`events`: it is the city of its venue, so `events` keeps only `venue_id`, and your `city` filter in
module 3 joined `venues`. If the city were copied into every event, renaming a venue's city would
mean updating many rows — and forgetting one gives two different answers to one question.

**Relations.** One-to-many (a user has many orders): the foreign key lives on the "many" side,
`orders.user_id`. Many-to-many (an event has many artists, an artist plays many events): neither
table can hold the other's id, so a third table holds the pairs — a join table.

**ON DELETE** — what happens to `tickets` when their `order` is deleted:

| option | what happens | use it when |
|---|---|---|
| `NO ACTION` / `RESTRICT` (default) | the delete fails while children exist | children are valuable on their own: orders of a user |
| `CASCADE` | children are deleted too | children make no sense without the parent: tickets of an order |
| `SET NULL` | children stay, the link becomes `NULL` | the link is optional: an event whose promoter left |

## Migrations in four ideas

**A migration is a SQL file in git.** Every schema change is a new file in
`api/prisma/migrations/<timestamp>_<name>/migration.sql`. Everyone — teammates, CI, production —
applies the same files in the same order and gets the same schema.

**The database remembers what it applied** — in the table `_prisma_migrations`. That is how
`prisma migrate deploy` knows which files are new.

**Never edit a migration that was already applied somewhere.** It will not run again, so your
edit changes nothing there — but a fresh database will get a different schema. Fix things with
a new migration.

**Data matters more than schema.** Adding a column to an empty table is trivial. Adding a
`NOT NULL` column to a table with a million rows, renaming a column that the running app still
reads — that is where production breaks. The safe pattern is *expand → migrate data → contract*:
add the new thing next to the old one, move the data, switch the code, and only then remove the old.

## Prisma in five ideas

**`schema.prisma`** — your tables described as models. One file, readable, with relations.

**Prisma Client** — TypeScript code *generated* from the schema (`pnpm prisma generate`) into
`api/src/generated/prisma`. Every query is typed: a typo in a column name is a compile error,
not a 500 at runtime. The generated code is not committed (see `api/.gitignore`); regenerate it
after every change of the schema and after `git pull`.

**`prisma migrate dev`** — for development: compares `schema.prisma` with the migrations,
writes a new migration file and applies it to your database. `--create-only` writes the file
without applying it, so you can edit the SQL first.

**`prisma migrate deploy`** — for CI and production: only applies migration files that are not
applied yet. Never generates anything. `pnpm db:migrate` calls it.

**Prisma is not all of SQL.** It cannot express `CHECK` constraints, indexes on expressions or
row locks. In those places you write SQL yourself — in a migration file, or with `$queryRaw`.

## Tasks

### 01 · Prisma schema from the existing database

Let Prisma read the existing tables: `pnpm prisma db pull`. Look at what it wrote into
`schema.prisma`, then make it pleasant to use from TypeScript:

- Models in PascalCase, singular: `User`, `Venue`, `Event`, `Order`, `Ticket`.
  Each model still points to its table: `@@map("users")`.
- Fields in camelCase: `createdAt`, `venueId`, `startsAt`, `basePrice`, `userId`, `orderId`,
  `eventId`, `seatNo`. Each still points to its column: `@map("created_at")`.
- Relation fields named by meaning: `event.venue` (one), `venue.events`, `user.orders`,
  `order.tickets` (many), `ticket.order`, `ticket.event`.

Then `pnpm prisma generate`. The database does not change at all in this task.

Learn: introspection; `@map` / `@@map` — the database and the code each keep their own naming
conventions. Read the warning `db pull` prints about check constraints: you will need it in task 02.

### 02 · Baseline migration `0_init`

Your database has tables, but no migrations. Before the first migration can be added, the
history must start from the schema that already exists:

1. Create `api/prisma/migrations/0_init/migration.sql` — SQL that creates the whole current
   schema from an empty database.
2. Tell your working database that `0_init` is already applied — its tables exist, running the
   file would fail: `pnpm prisma migrate resolve --applied 0_init`.
   (`pnpm db:migrate` does the same automatically — look at `tools/migrate.ts`.)
3. Check: `pnpm prisma migrate status` says the database is up to date, and
   `pnpm prisma migrate dev --create-only --name probe` produces an **empty** migration — Prisma
   sees no difference between your schema, the migrations and the database. Delete the probe.

Prisma can generate the SQL for you: look at `pnpm prisma migrate diff --help`
(`--from-empty`, `--to-schema`, `--script`). Compare its output with `db/init/01-schema.sql`.
The test builds an empty database from your `0_init` and checks that every table **and every
CHECK constraint** is there.

Learn: baselining an existing database, `_prisma_migrations`, `migration_lock.toml`, why the
migration history must be able to rebuild the database from zero.

### 03 · Prisma inside Nest: users

1. Create `PrismaService` in `api/src/database/`: a class that extends the generated
   `PrismaClient` and connects through the `pg` driver adapter:
   ```ts
   super({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '...' }) })
   ```
   Close the connections when the app stops (`onModuleDestroy` → `$disconnect()`).
   Provide and export it from `DatabaseModule`, next to `Pool`.
2. Rewrite `UsersService` with Prisma: `POST /users` and `GET /users/:id/orders`. It should not
   need `Pool` any more. Module 3 tests 05 and 06 must stay green.

Then turn on query logging (`log: ['query']` in the `super(...)` options), call
`GET /users/6/orders` and count the SQL queries Prisma sends. Is it N+1? How does it compare
with your single JOIN from module 3?

Learn: a Nest provider that wraps a library; `Prisma.Decimal` — prices come as `Decimal`,
not as strings: add them with `.add()` and call `.toNumber()` only for the response (remember the
float discussion in module 3); the Prisma error code for a unique violation (`P2002`)
instead of Postgres `23505`; `include` / `select` / `orderBy` for nested data.

### 04 · Constraints written by hand

Make the database itself refuse bad data:

- `tickets.seat_no` must be greater than 0; `tickets.price` must be ≥ 0.
- Emails must be unique **regardless of case**: `user1@mail.test` exists, so `User1@Mail.TEST`
  must be refused. The current `UNIQUE (email)` compares exact strings.

Prisma schema cannot describe any of this. Create an empty migration with
`pnpm prisma migrate dev --create-only --name <name>`, write the SQL yourself, then apply it with
`pnpm prisma migrate dev`.

Learn: `CHECK`, unique indexes on an expression (`lower(email)`), `--create-only`. Think: what
happens to `ALTER TABLE ... ADD CONSTRAINT` if the table already contains a row that breaks the rule?

### 05 · What happens on DELETE

A ticket cannot exist without its order: deleting an order must delete its tickets. But nothing
else must cascade — a user who has orders and an event that has sold tickets must still be
impossible to delete.

This time Prisma schema can describe the change (`onDelete` in `@relation`), so
`pnpm prisma migrate dev --name <name>` writes the migration for you. Read the SQL it generated.

Learn: `CASCADE` vs `RESTRICT`, and why you almost never cascade from a user or a payment:
orders are financial records, they outlive the account.

### 06 · Many-to-many: events and artists

Events have artists. One event has several artists, one artist plays many events.

- Table `artists`: `id`, `name` — unique.
- Table `event_artists`: `event_id`, `artist_id`; the pair is the primary key, so the same
  artist cannot be added to the same event twice. Both columns are foreign keys.
- Deleting an event removes its links. Deleting an artist who is linked to events is refused.
- In Prisma: models `Artist` and `EventArtist` (the join table as an explicit model),
  relation fields `event.artists` and `artist.events`, and `eventArtist.event` /
  `eventArtist.artist`. Prisma can load an event with its artists:
  `include: { artists: { include: { artist: true } } }`.

Learn: join tables, a composite primary key (`@@id`), why an explicit join model is usually
better than Prisma's implicit many-to-many (you choose the table name, and you can add columns
later — `is_headliner`, `stage_time`), and why `artist_id` gets its own index while `event_id`
does not need one.

### 07 · A new column for existing data: `orders.paid_at`

We want to know when an order was paid.

- New nullable column `orders.paid_at` (`timestamptz`), field `paidAt` in Prisma.
- Orders that are already `paid` or `refunded` get `paid_at = created_at` — the real payment time
  was never stored, this is the best approximation.
- From now on the database guarantees: a `paid` order always has `paid_at`, a `pending` order
  never has it.
- `POST /orders/:id/pay` sets `paid_at` to the current time.

Prisma writes the `ADD COLUMN` for you. The data update and the CHECK constraints are yours:
`--create-only`, then edit the file before applying. Remember `pnpm prisma generate` after the
schema change. Run `pnpm test:api` too: module 3 test 08 creates orders directly in the database
— your constraint must not break it.

Learn: the order of steps inside a data migration (add nullable → backfill → constrain), why the
column cannot be `NOT NULL` from the start, and what would change on a table with 100 million
rows (backfill in batches, *expand → migrate → contract* across several deploys).

### 08 · Transactions in Prisma: orders ⭐

Rewrite `OrdersService` with Prisma: `POST /orders` and `POST /orders/:id/pay`. Module 3 tests
07 and 08 must stay green.

- The order and its tickets are created inside an interactive transaction:
  `this.prisma.$transaction(async (tx) => { ... })`. Every query inside goes through `tx`;
  throwing inside the callback rolls everything back — no `BEGIN` / `ROLLBACK` / `release()` by hand.
- Tickets can be created together with the order (nested `create` / `createMany`).
- `pay`: the status check must stay inside the `UPDATE`, as in module 3. Prisma `update` cannot
  do it — look at `updateMany` and what it returns.
- Totals are added with `Decimal`, not with JS floats.

Prisma has no API for `SELECT ... FOR UPDATE` (the row lock from module 6). If you want it,
`tx.$queryRaw` with a tagged template — find out why `` $queryRaw`... ${id}` `` is safe and
`$queryRawUnsafe` with string concatenation is not.

Learn: interactive transactions, `updateMany` + `count`, where the ORM ends and raw SQL begins.
