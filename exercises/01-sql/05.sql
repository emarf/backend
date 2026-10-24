-- Task 05. The 10 most expensive events together with the venue they take place at.
-- Columns: event_id, title, venue_name, venue_city, base_price
-- Order by: base_price descending, then event_id

select e.id as event_id, e.title, v.name as venue_name, v.city as venue_city, e.base_price
from events e
join venues v on v.id = e.venue_id
order by e.base_price desc, e.id
limit 10;