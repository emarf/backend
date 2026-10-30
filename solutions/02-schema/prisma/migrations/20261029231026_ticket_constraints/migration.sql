-- Prisma schema cannot express CHECK constraints or expression indexes, so this migration is written by hand
ALTER TABLE tickets
    ADD CONSTRAINT tickets_seat_no_check CHECK (seat_no > 0),
    ADD CONSTRAINT tickets_price_check CHECK (price >= 0);

-- Emails are unique regardless of case: Anna@mail.test and anna@mail.test are the same person
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));
