-- Task 10. Top 10 events by venue occupancy. sold = number of tickets in orders with status 'paid'. fill_pct = sold * 100 / capacity, rounded to 1 decimal. Watch out for integer division!
-- Columns: event_id, title, capacity, sold, fill_pct
-- Order by: fill_pct descending, then event_id

select e.id as event_id, e.title, v.capacity, count(o.id) as sold, round(count(o.id) * 100.0 / v.capacity, 1) as fill_pct
from orders o
join tickets t
on o.id = t.order_id
join events e 
on e.id = t.event_id
join venues v 
on e.venue_id = v.id
where o.status = 'paid'
group by e.id, e.title, v.capacity
order by fill_pct desc, event_id
limit 10;