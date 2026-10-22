# Roadmap: frontend → fullstack

One end-to-end project — a **ticket sales service for events** (think Ticketmaster).
The domain is chosen on purpose: it naturally brings up all the hard backend topics —
complex reports, races for the last ticket, caching, queues, load.

Each module = theory + tasks + automated checks. You write the code, I review it.

## Module 0. Environment
- [ ] Install Docker Desktop (or OrbStack)
- [ ] Start Postgres with `docker compose up -d`
- [ ] Connect to the database with `psql` and with a GUI (TablePlus / DBeaver)
- Understand: image vs container, volume, port, environment variables

## Module 1. SQL fundamentals (you are here)
- SELECT, WHERE, ORDER BY, LIMIT, NULL
- GROUP BY, aggregates, HAVING
- JOIN (INNER/LEFT), subqueries, CTEs (`WITH`)
- Window functions (`ROW_NUMBER`, `SUM() OVER`, `LAG`)
- 📁 `exercises/01-sql`

## Module 2. Schema design
- Primary/foreign keys, constraints (`UNIQUE`, `CHECK`, `NOT NULL`)
- Normalization, 1:N and N:M relationships
- Migrations (changing the schema without breaking production)

## Module 3. NestJS + Postgres: your first API
- Modules, controllers, services, DI (this is where decorators come in)
- REST: the right methods and status codes (400, 409, 422…)
- DTO validation, error handling, pagination
- Database access: raw SQL via `pg` first, then an ORM — so you understand what the ORM does under the hood

## Module 4. Authentication and security
- Password hashing, sessions vs JWT, refresh tokens
- Where to store a token and why httpOnly cookies
- CORS, CSRF, SQL injection — break it, then fix it

## Module 5. Indexes and database performance
- `EXPLAIN ANALYZE`: reading a query plan
- B-tree indexes, composite indexes, when an index does not help
- Generate millions of rows and make a slow query 100× faster
- The N+1 problem

## Module 6. Transactions and concurrency ⭐
- ACID, isolation levels
- Task: two people buy the last ticket at the same time
- `SELECT ... FOR UPDATE`, optimistic locking, idempotent payments

## Module 7. Redis
- Caching (cache-aside, invalidation)
- Rate limiting
- Holding a seat for 10 minutes (TTL)
- Distributed locks

## Module 8. Kafka and async processing
- Why queues: "paid → send an email, issue the ticket, update analytics"
- Producers, consumers, topics, partitions, consumer groups
- The Outbox pattern, at-least-once delivery

## Module 9. Microservices and gRPC
- RPC vs REST, Protobuf
- Extract the payment service and talk to it over gRPC

## Module 10. Load (RPS)
- Load testing with k6
- Metrics: RPS, latency p50/p95/p99
- Find the bottleneck and remove it

## Module 11. Docker Compose → Kubernetes
- Your own Dockerfile, multi-stage builds
- The whole stack in compose: api + postgres + redis + kafka
- Kubernetes locally: Pod, Deployment, Service, ConfigMap, Secret
- Horizontal scaling

## Module 12. Deployment and observability
- VPS, CI/CD with GitHub Actions
- Logs, metrics, health checks
- A site for real users: connect a React frontend to your own API — the full stack
