-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paid_at" TIMESTAMPTZ(6);


UPDATE "orders" SET "paid_at" = "created_at"
WHERE "status" in ('paid', 'refunded');

ALTER TABLE "orders" 
    ADD CONSTRAINT orders_paid_has_paid_at_check CHECK  ("status" <> 'paid' OR "paid_at" IS NOT NULL),
    ADD CONSTRAINT orders_pending_has_no_paid_at_check CHECK  ("status" <> 'pending' OR "paid_at" IS NULL);
