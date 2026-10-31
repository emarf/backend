ALTER TABLE tickets
ADD CONSTRAINT tickets_seat_no_check CHECK  (seat_no > 0),
ADD CONSTRAINT tickets_price_check CHECK (price >= 0);

CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));
