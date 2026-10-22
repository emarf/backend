WITH daily AS (
    SELECT o.created_at::date AS day, sum(t.price) AS revenue
    FROM orders o
    JOIN tickets t ON t.order_id = o.id
    WHERE o.status = 'paid'
      AND o.created_at >= '2026-09-01' AND o.created_at < '2026-10-01'
    GROUP BY day
)
SELECT day, revenue, sum(revenue) OVER (ORDER BY day) AS running_total
FROM daily
ORDER BY day;
