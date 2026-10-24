-- Task 01. Users from Berlin (city = 'Berlin').
-- Columns: id, name, email
-- Order by: id

select u.id, u.name, u.email 
from users u 
where u.city = 'Berlin'