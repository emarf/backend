-- Task 06. Revenue by month. Revenue = sum of ticket prices in orders with status 'paid'. Month is text like '2026-01' (hint: to_char).
-- Columns: month, revenue
-- Order by: month

select to_char(o.created_at, 'YYYY-MM') as month, sum(t.price) as revenue
from orders o
join tickets t 
on o.id = t.order_id
where o.status = 'paid'
group by month
order by month;