# Review 1. Modules 1–3 again, from a different angle

Five short tasks, 10–15 minutes each. Each one repeats something that was hard the first time,
but it is a different problem, so you cannot copy your old code — you have to remember the idea.
There are no reference solutions for this review. If you get stuck, ask.

```bash
pnpm test:review      # all five
pnpm test:review 03   # one task (api/test/review/03-*.review-spec.ts)
```

SQL tasks run inside a transaction that is rolled back, so they never change the test database
for the next task. TypeScript tasks get a ready Prisma client as the first argument.

## 01 · Free tickets in one INSERT

File: `01-comp-tickets.sql`. Repeats: `insert ... select`, `generate_series`.

The box office gives `$3` free tickets (price `0`) to order `$1` for event `$2`. Seats continue
after the highest seat already taken for that event; an event with no tickets starts at seat 1.
Return `id, seat_no, price` of the new tickets.

One statement. Unlike module 3, you cannot read the highest seat in a separate query first:
it has to be part of the same INSERT.

## 02 · One CHECK, two directions

File: `02-paid-at-check.sql`. Repeats: CHECK as a boolean about one row.

In module 2 you wrote two one-way rules. Write one constraint
`orders_paid_at_matches_status_check` that says: `paid_at` is set **exactly when** the order is
`paid` or `refunded`. So a refunded order without `paid_at` is refused, and so is a cancelled
order with `paid_at`.

Before you write SQL, fill in this table for yourself: for every status, should `paid_at` be
set, empty, or does it not matter?

## 03 · A venue and its events in one Prisma query

File: `03-venue-schedule.ts`. Repeats: nested `select`, `orderBy` with several fields, `Decimal`.

Return `null` if the venue does not exist, otherwise:

```ts
{ name: 'O2 Academy', city: 'London', events: [{ id, title, startsAt, basePrice }] }
```

Events sorted by `startsAt`, then by `id` (both ascending). `basePrice` is a number. One Prisma
call for the data — no second query for the events, no sorting in JS.

## 04 · Cancel an order without a race

File: `04-cancel-order.ts`. Repeats: the check inside the UPDATE, `updateMany` + `count`.

Only a `pending` order can be cancelled. Return `'cancelled'`, `'not_found'` or `'not_pending'`.
The test cancels the same order twice **at the same time** — exactly one call may win.

## 05 · Delete an account

File: `05-delete-user.sql`. Repeats: ON DELETE, which side the rule lives on.

A user can delete their account, and their orders and tickets go with it. An event that has
tickets must still be impossible to delete. Change the right foreign key (its name is in
`\d orders` — look it up instead of guessing).

When it passes, answer for yourself: why did you not have to touch the `tickets` table?
