// Compares a query result with the expected one. Used by check-sql.ts.

export type Cell = string | number | null
export type Result = { columns: string[]; rows: Cell[][] }

const NUMERIC = /^-?\d+(\.\d+)?$/

// Brings values to a common shape: the driver returns bigint and numeric as strings,
// and timestamptz as Date objects
export function normalizeCell(value: unknown): Cell {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'number' || typeof value === 'bigint') return Number(value)
  const str = String(value)
  return NUMERIC.test(str) ? Number(str) : str
}

export function normalize(columns: string[], rows: Record<string, unknown>[]): Result {
  return { columns, rows: rows.map((row) => columns.map((col) => normalizeCell(row[col]))) }
}

function sameCell(a: Cell, b: Cell): boolean {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 0.005
  return a === b
}

// Returns null when results match, otherwise a readable description of the mismatch
export function diff(expected: Result, actual: Result): string | null {
  if (expected.columns.join() !== actual.columns.join()) {
    return `Columns differ.\n  expected: ${expected.columns.join(', ')}\n  actual:   ${actual.columns.join(', ')}`
  }
  for (let i = 0; i < Math.max(expected.rows.length, actual.rows.length); i++) {
    const exp = expected.rows[i]
    const act = actual.rows[i]
    if (!exp || !act) {
      return `Row count differs: expected ${expected.rows.length}, got ${actual.rows.length}.`
    }
    if (!exp.every((cell, j) => sameCell(cell, act[j]))) {
      return `Row ${i + 1} differs.\n  expected: ${JSON.stringify(exp)}\n  actual:   ${JSON.stringify(act)}`
    }
  }
  return null
}
