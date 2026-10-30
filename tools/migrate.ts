// Brings a database created from db/init up to date with the Prisma migrations in api/prisma.
//   pnpm db:migrate                       — the working database `tickets`
//   DATABASE_URL=... node tools/migrate.ts — any other database (the e2e tests do this)
//
// db/init has already created everything that the baseline migration 0_init describes,
// so 0_init is only *marked* as applied (baselining). Newer migrations are then applied for real.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

const API_DIR = join(import.meta.dirname, '..', 'api');
const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5432/tickets';

if (!existsSync(join(API_DIR, 'prisma', 'migrations', '0_init'))) {
  console.log(
    'No baseline migration 0_init yet (module 2, task 02): nothing to do.',
  );
  process.exit(0);
}

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();
// Postgres checks that every table in a query exists before running it, so ask in two steps
const { rows } = await client.query<{ exists: boolean }>(
  "SELECT to_regclass('_prisma_migrations') IS NOT NULL AS exists",
);
const baselined =
  rows[0].exists &&
  (
    await client.query(
      "SELECT 1 FROM _prisma_migrations WHERE migration_name = '0_init'",
    )
  ).rowCount === 1;
await client.end();

const prisma = (...args: string[]) =>
  execFileSync(join(API_DIR, 'node_modules', '.bin', 'prisma'), args, {
    cwd: API_DIR,
    env: { ...process.env, DATABASE_URL },
    stdio: process.env.MIGRATE_QUIET ? 'pipe' : 'inherit',
  });

if (!baselined) prisma('migrate', 'resolve', '--applied', '0_init');
prisma('migrate', 'deploy');
