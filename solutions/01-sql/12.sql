WITH spent AS (
    SELECT u.id AS user_id, u.name, u.city, sum(t.price) AS total
    FROM users u
    JOIN orders o ON o.user_id = u.id
    JOIN tickets t ON t.order_id = o.id
    WHERE o.status = 'paid' AND u.city IS NOT NULL
    GROUP BY u.id, u.name, u.city
),
ranked AS (
    SELECT *, row_number() OVER (PARTITION BY city ORDER BY total DESC, user_id) AS place
    FROM spent
)
SELECT city, place, user_id, name, total
FROM ranked
WHERE place <= 3
ORDER BY city, place;
