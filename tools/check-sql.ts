// Checks solutions for module 01-sql.
//   pnpm check:sql        — check all tasks
//   pnpm check:sql 07     — check a single task
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'
import { diff, normalize, type Result } from './sql-compare.ts'

const DIR = join(import.meta.dirname, '..', 'exercises', '01-sql')
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5432/tickets'

// Return date as a 'YYYY-MM-DD' string, otherwise the driver turns it into a Date in the local timezone
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value)

// Strip comments to tell whether anything has been written yet
const stripComments = (sql: string) => sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim()

const only = process.argv[2]
const tasks = readdirSync(DIR)
  .filter((file) => /^\d{2}\.sql$/.test(file))
  .map((file) => file.slice(0, 2))
  .filter((id) => !only || id === only.padStart(2, '0'))
  .sort()

const client = new pg.Client({ connectionString: DATABASE_URL })
try {
  await client.connect()
} catch (error) {
  console.error(`Could not connect to ${DATABASE_URL}\nIs the database running? Try: pnpm db:up\n`)
  console.error((error as Error).message)
  process.exit(1)
}

let passed = 0
for (const id of tasks) {
  const sql = stripComments(readFileSync(join(DIR, `${id}.sql`), 'utf8'))
  if (!sql) {
    console.log(`⚪ ${id} — not solved yet`)
    continue
  }
  const expected: Result = JSON.parse(readFileSync(join(DIR, 'expected', `${id}.json`), 'utf8'))
  // Run inside a transaction and roll back, so an accidental DELETE cannot damage the data
  await client.query("BEGIN; SET LOCAL TIME ZONE 'UTC'")
  try {
    const res = await client.query(sql)
    if (Array.isArray(res)) {
      console.log(`❌ ${id} — the file must contain exactly one query, found ${res.length}`)
      continue
    }
    const actual = normalize(res.fields.map((f) => f.name), res.rows)
    const problem = diff(expected, actual)
    if (problem) {
      console.log(`❌ ${id}\n  ${problem.replaceAll('\n', '\n  ')}`)
    } else {
      console.log(`✅ ${id}`)
      passed++
    }
  } catch (error) {
    console.log(`💥 ${id} — SQL error: ${(error as Error).message}`)
  } finally {
    await client.query('ROLLBACK')
  }
}

console.log(`\nSolved: ${passed} of ${tasks.length}`)
await client.end()
