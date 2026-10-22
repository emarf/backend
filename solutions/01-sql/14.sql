WITH paid AS (
    SELECT user_id,
           created_at,
           row_number() OVER (PARTITION BY user_id ORDER BY created_at) AS n
    FROM orders
    WHERE status = 'paid'
)
SELECT f.user_id,
       f.created_at AS first_paid_at,
       s.created_at AS second_paid_at,
       extract(day FROM s.created_at - f.created_at)::int AS days_between
FROM paid f
JOIN paid s ON s.user_id = f.user_id AND s.n = 2
WHERE f.n = 1
  AND s.created_at - f.created_at <= interval '30 days'
ORDER BY f.user_id;
