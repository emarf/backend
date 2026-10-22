SELECT id, title, starts_at, base_price
FROM events
WHERE category = 'concert' AND base_price > 100
ORDER BY base_price DESC, id;
