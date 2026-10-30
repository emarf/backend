# Tickets Backend — a learning project

Learning backend development through one end-to-end project: a ticket sales service.
The module-by-module plan is in [ROADMAP.md](ROADMAP.md).

## Quick start

1. Install Docker Desktop (or [OrbStack](https://orbstack.dev)) and start it
2. `pnpm install`
3. `pnpm db:up` — starts Postgres 17 with test data
4. Open [exercises/01-sql/README.md](exercises/01-sql/README.md) and start with task 01
5. Then the API module: [exercises/03-api/README.md](exercises/03-api/README.md)
6. Then schema, migrations and Prisma: [exercises/02-schema/README.md](exercises/02-schema/README.md)

## Structure

```
api/            the NestJS API you build in module 3; api/prisma — schema and migrations (module 2)
db/init/        schema and test data (run on the container's first start)
exercises/      tasks by module; SQL solutions go here
solutions/      reference solutions — look only after writing your own
tools/          checkers
```
