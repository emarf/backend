-- Task 07. Top 5 users by the total price of their paid tickets.
-- Columns: user_id, name, total
-- Order by: total descending, then user_id

select u.id as user_id, u.name as name, sum(t.price) as total
from users u 
join orders o 
on u.id = o.user_id 
join tickets t 
on t.order_id = o.id
where o.status = 'paid'
group by u.id 
order by total desc, user_id
limit 5;