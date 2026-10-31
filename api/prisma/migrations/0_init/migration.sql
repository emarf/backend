-- Schema of the ticket sales service.
-- For now just read it; you will design schemas yourself in module 2.

CREATE TABLE users (
    id          serial PRIMARY KEY,
    email       text        NOT NULL UNIQUE,
    name        text        NOT NULL,
    city        text,                          -- nullable: the user may not have set a city
    created_at  timestamptz NOT NULL
);

CREATE TABLE venues (
    id        serial PRIMARY KEY,
    name      text    NOT NULL,
    city      text    NOT NULL,
    capacity  integer NOT NULL CHECK (capacity > 0)
);

CREATE TABLE events (
    id          serial PRIMARY KEY,
    venue_id    integer       NOT NULL REFERENCES venues (id),
    title       text          NOT NULL,
    category    text          NOT NULL CHECK (category IN ('concert', 'theatre', 'standup', 'sport', 'festival')),
    starts_at   timestamptz   NOT NULL,
    base_price  numeric(10,2) NOT NULL CHECK (base_price >= 0)
);

CREATE TABLE orders (
    id          serial PRIMARY KEY,
    user_id     integer     NOT NULL REFERENCES users (id),
    status      text        NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
    created_at  timestamptz NOT NULL
);

-- One order may contain several tickets for the same event
CREATE TABLE tickets (
    id        serial PRIMARY KEY,
    order_id  integer       NOT NULL REFERENCES orders (id),
    event_id  integer       NOT NULL REFERENCES events (id),
    seat_no   integer       NOT NULL,
    price     numeric(10,2) NOT NULL,
    UNIQUE (event_id, seat_no)                 -- the same seat cannot be sold twice
);
