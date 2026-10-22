WITH spent AS (
    SELECT o.user_id, sum(t.price) AS total
    FROM orders o
    JOIN tickets t ON t.order_id = o.id
    WHERE o.status = 'paid'
    GROUP BY o.user_id
)
SELECT user_id, total
FROM spent
WHERE total > (SELECT avg(total) FROM spent)
ORDER BY total DESC, user_id;
