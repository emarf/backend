WITH event_revenue AS (
    SELECT e.id AS event_id, e.title, e.category, sum(t.price) AS revenue
    FROM events e
    JOIN tickets t ON t.event_id = e.id
    JOIN orders o ON o.id = t.order_id
    WHERE o.status = 'paid'
    GROUP BY e.id, e.title, e.category
),
category_avg AS (
    SELECT category, avg(revenue) AS avg_revenue
    FROM event_revenue
    GROUP BY category
)
SELECT r.event_id, r.title, r.category, r.revenue, round(c.avg_revenue, 2) AS category_avg
FROM event_revenue r
JOIN category_avg c ON c.category = r.category
WHERE r.revenue > c.avg_revenue
ORDER BY r.category, r.revenue DESC, r.event_id;
