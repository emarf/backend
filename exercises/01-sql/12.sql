-- Task 12. Top 3 users by paid ticket total in each city. Skip users without a city. On equal totals the lower user_id ranks higher (hint: window function row_number).
-- Columns: city, place, user_id, name, total
-- Order by: city, then place

with spent as (select u.city, u.id as user_id, u.name, sum(t.price) as total 
from users u 
join orders o 
on u.id = o.user_id 
join tickets t
on o.id = t.order_id 
where o.status = 'paid' and u.city is not null
group by u.city, u.id, u.name),
ranked as (select *, row_number() over (partition by city order by total desc, user_id) as place from spent)
select city, place, user_id, name, total from ranked
where place <= 3
order by city, place