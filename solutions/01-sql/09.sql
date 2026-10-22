SELECT v.id AS venue_id, v.name, count(*) AS events_count, round(avg(e.base_price), 2) AS avg_price
FROM venues v
JOIN events e ON e.venue_id = v.id
GROUP BY v.id, v.name
HAVING avg(e.base_price) > 80
ORDER BY avg_price DESC, venue_id;
