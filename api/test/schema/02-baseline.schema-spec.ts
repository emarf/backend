import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client, Pool } from 'pg';
import { API_DIR } from './helpers';

const MIGRATIONS_DIR = join(API_DIR, 'prisma', 'migrations');
const INIT_SQL = join(MIGRATIONS_DIR, '0_init', 'migration.sql');
const CHECK_DB = 'tickets_baseline_check';

describe('02 · Baseline migration 0_init', () => {
  it('has prisma/migrations/0_init/migration.sql and migration_lock.toml', () => {
    expect(existsSync(INIT_SQL)).toBe(true);
    expect(existsSync(join(MIGRATIONS_DIR, 'migration_lock.toml'))).toBe(true);
  });

  it('is recorded as applied in the database', async () => {
    const db = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const { rows } = await db.query(
        "SELECT 1 FROM _prisma_migrations WHERE migration_name = '0_init' AND finished_at IS NOT NULL",
      );
      expect(rows).toHaveLength(1);
    } finally {
      await db.end();
    }
  });

  // A new teammate, CI or a fresh server builds the database from the migrations alone,
  // so 0_init must recreate the whole schema — including what Prisma schema cannot express
  it('recreates all tables and CHECK constraints on an empty database', async () => {
    const admin = new Client({
      connectionString: 'postgres://app:app@localhost:5432/postgres',
    });
    await admin.connect();
    await admin.query(`DROP DATABASE IF EXISTS ${CHECK_DB} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${CHECK_DB}`);
    const db = new Client({
      connectionString: `postgres://app:app@localhost:5432/${CHECK_DB}`,
    });
    try {
      await db.connect();
      await db.query(readFileSync(INIT_SQL, 'utf8'));

      const tables = await db.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1",
      );
      expect(tables.rows.map((r) => r.table_name)).toEqual([
        'events',
        'orders',
        'tickets',
        'users',
        'venues',
      ]);

      const checks = await db.query(
        "SELECT conname FROM pg_constraint WHERE contype = 'c' AND connamespace = 'public'::regnamespace ORDER BY 1",
      );
      expect(checks.rows.map((r) => r.conname)).toEqual([
        'events_base_price_check',
        'events_category_check',
        'orders_status_check',
        'venues_capacity_check',
      ]);
    } finally {
      await db.end();
      await admin.query(`DROP DATABASE IF EXISTS ${CHECK_DB} WITH (FORCE)`);
      await admin.end();
    }
  });
});
