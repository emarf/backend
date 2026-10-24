SELECT o.user_id, count(DISTINCT t.event_id) AS events_count
FROM orders o
JOIN tickets t ON t.order_id = o.id
WHERE o.status = 'paid'
GROUP BY o.user_id
HAVING count(DISTINCT t.event_id) >= 10
ORDER BY events_count DESC, o.user_id;
