ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "fabricCode"        TEXT,
  ADD COLUMN IF NOT EXISTS "fabricComposition" TEXT,
  ADD COLUMN IF NOT EXISTS "fabricPrice"       NUMERIC(10, 2);
