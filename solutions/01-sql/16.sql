SELECT u.id AS user_id, u.name, count(o.id) AS cancelled_orders
FROM users u
LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'cancelled'
WHERE u.city = 'Lisbon'
GROUP BY u.id, u.name
ORDER BY cancelled_orders DESC, user_id;
