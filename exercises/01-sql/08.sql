-- Task 08. Users who have never placed an order (in any status).
-- Columns: id, email
-- Order by: id

select u.id, u.email
from users u 
left join orders o 
on u.id = o.user_id 
where o.id is null
order by u.id