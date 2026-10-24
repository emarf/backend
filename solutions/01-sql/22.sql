WITH by_category AS (
    SELECT e.category, sum(t.price) AS revenue
    FROM events e
    JOIN tickets t ON t.event_id = e.id
    JOIN orders o ON o.id = t.order_id
    WHERE o.status = 'paid'
    GROUP BY e.category
)
SELECT category, revenue, round(revenue * 100 / sum(revenue) OVER (), 1) AS share_pct
FROM by_category
ORDER BY revenue DESC;
