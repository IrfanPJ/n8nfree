-- Migrate Order statuses from old 8-value set to new 12-value set
-- Run in Supabase SQL Editor (single execution)

-- ─── Step 1: Drop column defaults that depend on the enum ────────────────────
ALTER TABLE "Order"        ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "OrderHistory" ALTER COLUMN status DROP DEFAULT;

-- ─── Step 2: Detach columns from the enum ────────────────────────────────────
ALTER TABLE "Order"        ALTER COLUMN status TYPE text;
ALTER TABLE "OrderHistory" ALTER COLUMN status TYPE text;

-- ─── Step 3: Migrate existing rows ───────────────────────────────────────────
UPDATE "Order"
SET status = CASE status
  WHEN 'PENDING'    THEN 'MEASUREMENT'
  WHEN 'MEASURING'  THEN 'MEASUREMENT'
  WHEN 'CUTTING'    THEN 'CUTTING'
  WHEN 'STITCHING'  THEN 'SEMI_STITCH'
  WHEN 'TRIAL'      THEN 'TRIAL'
  WHEN 'READY'      THEN 'READY_FOR_DELIVERY'
  WHEN 'DELIVERED'  THEN 'DELIVERED'
  WHEN 'CANCELLED'  THEN 'ORDER_CLOSED'
  ELSE status
END
WHERE status IN ('PENDING','MEASURING','CUTTING','STITCHING','TRIAL','READY','DELIVERED','CANCELLED');

UPDATE "OrderHistory"
SET status = CASE status
  WHEN 'PENDING'    THEN 'MEASUREMENT'
  WHEN 'MEASURING'  THEN 'MEASUREMENT'
  WHEN 'CUTTING'    THEN 'CUTTING'
  WHEN 'STITCHING'  THEN 'SEMI_STITCH'
  WHEN 'TRIAL'      THEN 'TRIAL'
  WHEN 'READY'      THEN 'READY_FOR_DELIVERY'
  WHEN 'DELIVERED'  THEN 'DELIVERED'
  WHEN 'CANCELLED'  THEN 'ORDER_CLOSED'
  ELSE status
END
WHERE status IN ('PENDING','MEASURING','CUTTING','STITCHING','TRIAL','READY','DELIVERED','CANCELLED');

-- ─── Step 4: Drop old enum and create the new one ────────────────────────────
DROP TYPE "OrderStatus";

CREATE TYPE "OrderStatus" AS ENUM (
  'MEASUREMENT',
  'FABRIC_ORDERING',
  'FABRIC_COLLECTED',
  'CUTTING',
  'SEMI_STITCH',
  'TRIAL',
  'FINAL_STITCH',
  'READY_FOR_DELIVERY',
  'DELIVERED',
  'PENDING_ALTERATION',
  'READY_FINAL_DELIVERY',
  'ORDER_CLOSED'
);

-- ─── Step 5: Restore columns to the new enum type ────────────────────────────
ALTER TABLE "Order"
  ALTER COLUMN status TYPE "OrderStatus" USING status::"OrderStatus";

ALTER TABLE "OrderHistory"
  ALTER COLUMN status TYPE "OrderStatus" USING status::"OrderStatus";

-- ─── Step 6: Restore the default value on Order.status ───────────────────────
ALTER TABLE "Order" ALTER COLUMN status SET DEFAULT 'MEASUREMENT'::"OrderStatus";

-- ─── Verify ───────────────────────────────────────────────────────────────────
SELECT status, COUNT(*) FROM "Order" GROUP BY status ORDER BY status;
