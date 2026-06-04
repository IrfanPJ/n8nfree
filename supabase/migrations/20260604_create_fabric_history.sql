CREATE TABLE IF NOT EXISTS "FabricHistory" (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  value       TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(type, value)
);

ALTER TABLE "FabricHistory" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_fabrichistory" ON "FabricHistory";
CREATE POLICY "auth_all_fabrichistory" ON "FabricHistory"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
