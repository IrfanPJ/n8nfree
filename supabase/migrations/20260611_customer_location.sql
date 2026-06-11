-- Add area and country fields to Customer; city already exists
ALTER TABLE "Customer"
  ADD COLUMN IF NOT EXISTS "area"          TEXT,
  ADD COLUMN IF NOT EXISTS "country"       TEXT,
  ADD COLUMN IF NOT EXISTS "countryCustom" TEXT;
