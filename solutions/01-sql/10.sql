SELECT e.id AS event_id,
       e.title,
       v.capacity,
       count(o.id) AS sold,
       round(count(o.id) * 100.0 / v.capacity, 1) AS fill_pct
FROM events e
JOIN venues v ON v.id = e.venue_id
LEFT JOIN tickets t ON t.event_id = e.id
LEFT JOIN orders o ON o.id = t.order_id AND o.status = 'paid'
GROUP BY e.id, e.title, v.capacity
ORDER BY fill_pct DESC, event_id
LIMIT 10;
