# Module 1. SQL

14 tasks, from "read a table" to window functions. Each solution is a single SQL query
in the `NN.sql` file. The task statement is already in a comment at the top of the file.

## How to work

```bash
pnpm db:up          # start Postgres (Docker must be running)
pnpm db:psql        # open the psql console — experiment here
pnpm check:sql      # check all solutions
pnpm check:sql 07   # check a single task
pnpm db:reset       # recreate the database from scratch if you broke something
```

Workflow: write a query in `psql` or a GUI (TablePlus / DBeaver), look at the result,
polish it and copy it into the task file. The checker runs your query inside a transaction
and rolls it back, so you cannot damage the data.

Useful in `psql`: `\dt` — list tables, `\d orders` — table structure,
`\x` — vertical output for wide rows, `\q` — quit.

Stuck? Ask me and we'll work through it. Reference solutions live in `solutions/`, but open them
only after your own version passes the check — then you can compare approaches.

## Data

```
users ──< orders ──< tickets >── events >── venues
```

- `users` — buyers (some have no city, some have no orders)
- `venues` — venues, each with a `capacity`
- `events` — events held at venues, `base_price` is the base ticket price
- `orders` — orders with status `pending | paid | cancelled | refunded`
- `tickets` — tickets: which order, which event, seat, price

**Only** orders with status `paid` bring in money.

## Theory by block

**01–03. Basic queries.** `SELECT … FROM … WHERE … ORDER BY … LIMIT`.
Trap: `NULL` means "unknown", and `city = NULL` is never true. Use `IS NULL`.

**04, 06, 09. Grouping.** `GROUP BY` collapses rows into groups and applies aggregates
to each group: `count`, `sum`, `avg`, `min`, `max`. `WHERE` filters rows *before* grouping,
`HAVING` filters groups *after*.

**05, 07, 08, 10. JOIN.** `JOIN` (aka `INNER JOIN`) keeps only rows that have a match.
`LEFT JOIN` keeps every row of the left table and fills `NULL` where there is no match.
The classic trap from task 10: a condition on the right table in `WHERE` silently turns
a `LEFT JOIN` back into an `INNER JOIN`.

**11. Subqueries and CTEs.** `WITH name AS (SELECT …)` is a named intermediate result —
like extracting a piece of code into a variable.

**12–14. Window functions.** An aggregate that does *not* collapse rows:
`row_number() OVER (PARTITION BY city ORDER BY total DESC)` numbers rows within each
city. `sum(x) OVER (ORDER BY day)` gives a running total.

Docs: https://www.postgresql.org/docs/17/tutorial-sql.html (chapters 2 and 3).
