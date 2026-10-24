-- Task 09. Venues where the average base price of events is above 80. Round avg_price to 2 decimals (round).
-- Columns: venue_id, name, events_count, avg_price
-- Order by: avg_price descending, then venue_id

select v.id as venue_id, v.name, count(*) as events_count, round(avg(e.base_price),2) as avg_price
from events e 
join venues v 
on e.venue_id = v.id 
group by v.id
having avg(e.base_price) > 80
order by avg_price desc, venue_id