-- Task 11. Users who spent (paid) more than the average buyer. Average only over users who have paid orders (hint: WITH).
-- Columns: user_id, total
-- Order by: total descending, then user_id

with spent as (select u.id as user_id, sum(t.price) as total 
from users u 
join orders o 
on u.id = o.user_id 
join tickets t 
on o.id = t.order_id 
where o.status = 'paid'
group by u.id)
select user_id, total from spent
where total > (select avg(total) from spent)
order by total desc, user_id