CREATE TABLE IF NOT EXISTS "BusinessSettings" (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  name TEXT NOT NULL DEFAULT '',
  gst TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed one empty row so upsert always works
INSERT INTO "BusinessSettings" (id) VALUES ('singleton')
ON CONFLICT (id) DO NOTHING;
