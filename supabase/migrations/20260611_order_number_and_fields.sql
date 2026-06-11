-- Add custom order number, trial toggle, master tailor, salesperson, styling, and notes fields to Order
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "customOrderNumber"  TEXT,
  ADD COLUMN IF NOT EXISTS "trialRequired"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "masterTailorId"      TEXT,
  ADD COLUMN IF NOT EXISTS "salespersonId"       TEXT,
  ADD COLUMN IF NOT EXISTS "stylingName"         TEXT,
  ADD COLUMN IF NOT EXISTS "stylingNotes"        TEXT,
  ADD COLUMN IF NOT EXISTS "stylingImageUrls"    TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "purchaseNotes"       TEXT,
  ADD COLUMN IF NOT EXISTS "specialNotes"        TEXT;

-- Unique index so no two ACTIVE (non-deleted) orders share the same custom number
DROP INDEX IF EXISTS "Order_customOrderNumber_key";
CREATE UNIQUE INDEX "Order_customOrderNumber_key"
  ON "Order"("customOrderNumber")
  WHERE "customOrderNumber" IS NOT NULL AND "isActive" = true;

-- FK to master tables (only if tables exist — safe to run after 20260611_master_tables.sql)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'TailorMaster')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints
       WHERE constraint_name = 'Order_masterTailorId_fkey'
     ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_masterTailorId_fkey"
        FOREIGN KEY ("masterTailorId") REFERENCES "TailorMaster"(id) ON DELETE SET NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Salesperson')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints
       WHERE constraint_name = 'Order_salespersonId_fkey'
     ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_salespersonId_fkey"
        FOREIGN KEY ("salespersonId") REFERENCES "Salesperson"(id) ON DELETE SET NULL;
  END IF;
END $$;
