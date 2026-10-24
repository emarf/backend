WITH monthly AS (
    SELECT to_char(o.created_at, 'YYYY-MM') AS month, sum(t.price) AS revenue
    FROM orders o
    JOIN tickets t ON t.order_id = o.id
    WHERE o.status = 'paid'
    GROUP BY to_char(o.created_at, 'YYYY-MM')
)
SELECT month,
       revenue,
       lag(revenue) OVER (ORDER BY month) AS prev_revenue,
       revenue - lag(revenue) OVER (ORDER BY month) AS change
FROM monthly
ORDER BY month;
