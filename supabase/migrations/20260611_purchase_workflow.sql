-- Add purchase workflow: status stages, order linkage, fabric details, notes
ALTER TABLE "Purchase"
  ADD COLUMN IF NOT EXISTS "orderId"       TEXT REFERENCES "Order"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "status"        TEXT NOT NULL DEFAULT 'PENDING_PURCHASE',
  ADD COLUMN IF NOT EXISTS "purchaseNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "fabricColor"   TEXT,
  ADD COLUMN IF NOT EXISTS "fabricCode"    TEXT;

-- status values: PENDING_PURCHASE | FABRIC_ORDERED | FABRIC_COLLECTED

CREATE INDEX IF NOT EXISTS "Purchase_orderId_idx" ON "Purchase"("orderId");
