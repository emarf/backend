SELECT v.city,
       count(t.id) AS tickets_sold,
       sum(t.price) AS revenue,
       round(avg(t.price), 2) AS avg_ticket_price
FROM venues v
JOIN events e ON e.venue_id = v.id
JOIN tickets t ON t.event_id = e.id
JOIN orders o ON o.id = t.order_id
WHERE o.status = 'paid'
GROUP BY v.city
ORDER BY revenue DESC;
