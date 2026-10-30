import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const API_DIR = join(__dirname, '..', '..');
const CLIENT_PATH = join(API_DIR, 'src', 'generated', 'prisma', 'client.ts');

// The generated client does not exist until task 01, so it is loaded at runtime, not imported
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadPrismaModule(): any {
  if (!existsSync(CLIENT_PATH)) {
    throw new Error(
      'Prisma Client is not generated yet (task 01). Run: pnpm prisma generate',
    );
  }
  return require(CLIENT_PATH);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createPrisma(): any {
  const { PrismaClient } = loadPrismaModule();
  const { PrismaPg } = require('@prisma/adapter-pg');
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
}

// Runs a query that must fail and returns the Postgres error code (23505, 23514, ...)
export async function pgErrorCode(query: Promise<unknown>): Promise<string> {
  try {
    await query;
  } catch (error) {
    return (error as { code?: string }).code ?? String(error);
  }
  return 'no error: the database accepted it';
}
