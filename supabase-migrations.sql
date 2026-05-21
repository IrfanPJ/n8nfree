-- ============================================================
-- House of Tailors — Supabase SQL Migrations
-- Run these in your Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ── Lead table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Lead" (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  interest    TEXT,
  stage       TEXT NOT NULL DEFAULT 'ENQUIRY',
  notes       TEXT,
  value       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  source      TEXT,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
DROP POLICY IF EXISTS "auth_all_lead" ON "Lead";
CREATE POLICY "auth_all_lead" ON "Lead"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Fabric table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Fabric" (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL,
  color           TEXT,
  "stockQty"      NUMERIC(10, 2) NOT NULL DEFAULT 0,
  "reorderLevel"  NUMERIC(10, 2) NOT NULL DEFAULT 5,
  supplier        TEXT,
  "pricePerUnit"  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unit            TEXT NOT NULL DEFAULT 'm',
  notes           TEXT,
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE "Fabric" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
DROP POLICY IF EXISTS "auth_all_fabric" ON "Fabric";
CREATE POLICY "auth_all_fabric" ON "Fabric"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Optional: seed default Fabric types (run after table creation)
-- INSERT INTO "Fabric" (id, name, type, color, "stockQty", "reorderLevel", "pricePerUnit", unit)
-- VALUES
--   (gen_random_uuid()::text, 'Italian Wool — Charcoal', 'Wool', 'Charcoal', 15, 5, 2500, 'm'),
--   (gen_random_uuid()::text, 'Navy Blue Linen', 'Linen', 'Navy Blue', 20, 5, 1200, 'm');

-- ── Product table (POS products managed in DB) ───────────────
CREATE TABLE IF NOT EXISTS "Product" (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  price       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  category    TEXT NOT NULL,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all_product" ON "Product";
CREATE POLICY "auth_all_product" ON "Product"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── POSSale table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "POSSale" (
  id              TEXT PRIMARY KEY,
  "receiptNo"     TEXT NOT NULL,
  "clientName"    TEXT,
  items           JSONB NOT NULL DEFAULT '[]',
  subtotal        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax             NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE "POSSale" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
DROP POLICY IF EXISTS "auth_all_possale" ON "POSSale";
CREATE POLICY "auth_all_possale" ON "POSSale"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
