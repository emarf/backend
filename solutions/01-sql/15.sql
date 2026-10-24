SELECT e.id AS event_id, e.title
FROM events e
WHERE NOT EXISTS (
    SELECT 1
    FROM tickets t
    JOIN orders o ON o.id = t.order_id
    WHERE t.event_id = e.id AND o.status = 'refunded'
)
ORDER BY e.id;
