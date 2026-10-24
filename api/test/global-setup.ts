import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

const INIT_DIR = join(__dirname, '..', '..', 'db', 'init');

// Recreates the test database from db/init before every test run
export default async function globalSetup(): Promise<void> {
  const admin = new Client({ connectionString: 'postgres://app:app@localhost:5432/postgres' });
  try {
    await admin.connect();
  } catch {
    throw new Error('Cannot connect to Postgres on localhost:5432. Is it running? Try: pnpm db:up');
  }
  await admin.query('DROP DATABASE IF EXISTS tickets_test WITH (FORCE)');
  await admin.query('CREATE DATABASE tickets_test');
  await admin.end();

  const db = new Client({ connectionString: 'postgres://app:app@localhost:5432/tickets_test' });
  await db.connect();
  await db.query("SET TIME ZONE 'UTC'");
  for (const file of ['01-schema.sql', '02-seed.sql']) {
    await db.query(readFileSync(join(INIT_DIR, file), 'utf8'));
  }
  await db.end();
}
