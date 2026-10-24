-- Task 02. Concerts (category = 'concert') with a base price above 100.
-- Columns: id, title, starts_at, base_price
-- Order by: base_price descending, then id

select e.id, e.title, e.starts_at, e.base_price
from events e
where e.category = 'concert' and e.base_price > 100
order by e.base_price desc, e.id; 