SELECT to_char(o.created_at, 'YYYY-MM') AS month, sum(t.price) AS revenue
FROM orders o
JOIN tickets t ON t.order_id = o.id
WHERE o.status = 'paid'
GROUP BY month
ORDER BY month;
