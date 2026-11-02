-- Task 02. Write one ALTER TABLE ... ADD CONSTRAINT here.

ALTER TABLE "orders"
  ADD CONSTRAINT orders_paid_at_matches_status_check CHECK (
    ("status" IN ('paid', 'refunded') AND "paid_at" IS NOT NULL)
    OR 
    ("status" IN ('cancelled', 'pending') AND "paid_at" IS NULL)
  )
