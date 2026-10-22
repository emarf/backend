SELECT status, count(*) AS cnt
FROM orders
GROUP BY status
ORDER BY cnt DESC;
