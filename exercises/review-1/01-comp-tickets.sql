-- Task 01. Write one INSERT here. Parameters: $1 order id, $2 event id, $3 how many tickets.
insert into tickets (order_id, event_id, seat_no, price)
select $1, $2, (select coalesce(max(t.seat_no), 0) as max_seat_no from tickets t where t.event_id = $2) + n, 0
from generate_series(1, $3) as n
returning id, seat_no, price
