-- Multi-branch retrofit, step 1: Branch master table.
-- Purely additive — no existing table or query is touched here.

CREATE TABLE IF NOT EXISTS "Branch" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  address     TEXT,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "Branch" DISABLE ROW LEVEL SECURITY;

-- Seed the existing single branch so every current row has somewhere to point.
INSERT INTO "Branch" (id, name, code)
VALUES ('business-bay', 'Business Bay', 'BB')
ON CONFLICT (id) DO NOTHING;
