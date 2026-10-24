WITH ranked AS (
    SELECT category, id AS event_id, title, base_price,
           row_number() OVER (PARTITION BY category ORDER BY base_price DESC, id) AS n
    FROM events
)
SELECT category, event_id, title, base_price
FROM ranked
WHERE n = 1
ORDER BY category;
