SELECT u.id AS user_id, u.name, sum(t.price) AS total
FROM users u
JOIN orders o ON o.user_id = u.id
JOIN tickets t ON t.order_id = o.id
WHERE o.status = 'paid'
GROUP BY u.id, u.name
ORDER BY total DESC, user_id
LIMIT 5;
