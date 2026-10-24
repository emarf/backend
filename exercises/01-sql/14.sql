-- Task 14. Users whose second paid order came no later than 30 days after their first. days_between = number of full days between them.
-- Columns: user_id, first_paid_at, second_paid_at, days_between
-- Order by: user_id

with paid as (select o.user_id, o.created_at, row_number() over (partition by o.user_id order by o.created_at) as n 
from orders o
where o.status = 'paid')
select i.user_id, i.created_at as first_paid_at, j.created_at as second_paid_at, extract(day from j.created_at - i.created_at)::int as days_between
from paid i
join paid j
on i.user_id = j.user_id 
where i.n = 1 and j.n = 2 and j.created_at - i.created_at <= interval '30 days'
order by user_id