-- Master tables for tailor assignment, salesperson, garment types, and location data

CREATE TABLE IF NOT EXISTS "TailorMaster" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name            TEXT NOT NULL,
  phone           TEXT,
  specialization  TEXT,
  notes           TEXT,
  branch          TEXT,
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "TailorMaster" DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "Salesperson" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name        TEXT NOT NULL,
  phone       TEXT,
  branch      TEXT,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "Salesperson" DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "GarmentTypeMaster" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name        TEXT NOT NULL UNIQUE,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "GarmentTypeMaster" DISABLE ROW LEVEL SECURITY;

INSERT INTO "GarmentTypeMaster" (id, name) VALUES
  (gen_random_uuid()::TEXT, 'Suit'),
  (gen_random_uuid()::TEXT, 'Jacket'),
  (gen_random_uuid()::TEXT, 'Blazer'),
  (gen_random_uuid()::TEXT, 'Shirt'),
  (gen_random_uuid()::TEXT, 'Trousers'),
  (gen_random_uuid()::TEXT, 'Waistcoat'),
  (gen_random_uuid()::TEXT, 'Tie'),
  (gen_random_uuid()::TEXT, 'Kandura'),
  (gen_random_uuid()::TEXT, 'Sherwani'),
  (gen_random_uuid()::TEXT, 'Other')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS "CustomCountry" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name        TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "CustomCountry" DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "CustomCity" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name        TEXT NOT NULL,
  country     TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, country)
);

ALTER TABLE "CustomCity" DISABLE ROW LEVEL SECURITY;

-- FK constraints are applied after Order columns exist (see 20260611_order_number_and_fields.sql)
