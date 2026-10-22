SELECT e.id AS event_id, e.title, v.name AS venue_name, v.city AS venue_city, e.base_price
FROM events e
JOIN venues v ON v.id = e.venue_id
ORDER BY e.base_price DESC, e.id
LIMIT 10;
