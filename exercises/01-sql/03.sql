-- Task 03. How many users have not set a city?
-- Columns: cnt
-- Order by: —
select count(*) as cnt 
from users
where city is null;