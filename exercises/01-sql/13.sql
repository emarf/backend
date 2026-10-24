-- Task 13. Paid revenue per day in September 2026 and a running total. Only days with sales. day has type date.
-- Columns: day, revenue, running_total
-- Order by: day

with daily as (select cast(o.created_at as date) as day, sum(t.price) as revenue 
from orders o 
join tickets t 
on o.id = t.order_id
where o.status = 'paid' and o.created_at >= '2026-09-01' and o.created_at < '2026-10-01'
group by cast(o.created_at as date))
select day, revenue, sum(revenue) over (order by day) as running_total from daily
order by day