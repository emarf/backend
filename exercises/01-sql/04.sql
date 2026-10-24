-- Task 04. Number of orders in each status.
-- Columns: status, cnt
-- Order by: cnt descending

select status, count(*) as cnt 
from orders
group by status
order by cnt desc;
