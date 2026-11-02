import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool, PoolClient } from 'pg';

const REVIEW_DIR = join(__dirname, '..', '..', '..', 'exercises', 'review-1');

// Reads the student's SQL and fails with a clear message while the file still has only comments
export function readTaskSql(file: string): string {
  const sql = readFileSync(join(REVIEW_DIR, file), 'utf8');
  const code = sql.replace(/--.*$/gm, '').trim();
  if (!code) {
    throw new Error(`Write your SQL in exercises/review-1/${file}`);
  }
  return sql;
}

// Runs fn inside a transaction that is always rolled back, so a task never changes the database
export async function inRollback<T>(
  db: Pool,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    return await fn(client);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
}

// Runs a query that must fail and returns the Postgres error code
export async function errorCode(query: Promise<unknown>): Promise<string> {
  try {
    await query;
  } catch (error) {
    return (error as { code?: string }).code ?? String(error);
  }
  return 'no error: the database accepted it';
}
