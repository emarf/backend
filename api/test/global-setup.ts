import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

const ROOT_DIR = join(__dirname, '..', '..');
const INIT_DIR = join(ROOT_DIR, 'db', 'init');
const TEST_DATABASE_URL = 'postgres://app:app@localhost:5432/tickets_test';

// Recreates the test database before every test run: db/init first (like the docker container),
// then the Prisma migrations from module 2 on top — exactly how `pnpm db:migrate` updates your working database
export default async function globalSetup(): Promise<void> {
  const admin = new Client({
    connectionString: 'postgres://app:app@localhost:5432/postgres',
  });
  try {
    await admin.connect();
  } catch {
    throw new Error(
      'Cannot connect to Postgres on localhost:5432. Is it running? Try: pnpm db:up',
    );
  }
  await admin.query('DROP DATABASE IF EXISTS tickets_test WITH (FORCE)');
  await admin.query('CREATE DATABASE tickets_test');
  await admin.end();

  const db = new Client({ connectionString: TEST_DATABASE_URL });
  await db.connect();
  await db.query("SET TIME ZONE 'UTC'");
  for (const file of ['01-schema.sql', '02-seed.sql']) {
    await db.query(readFileSync(join(INIT_DIR, file), 'utf8'));
  }
  await db.end();

  try {
    execFileSync(process.execPath, [join(ROOT_DIR, 'tools', 'migrate.ts')], {
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL,
        MIGRATE_QUIET: '1',
      },
      stdio: 'pipe',
    });
  } catch (error) {
    const { stdout, stderr } = error as { stdout?: Buffer; stderr?: Buffer };
    throw new Error(
      `Applying Prisma migrations to the test database failed:\n${stdout ?? ''}${stderr ?? ''}`,
    );
  }
}
