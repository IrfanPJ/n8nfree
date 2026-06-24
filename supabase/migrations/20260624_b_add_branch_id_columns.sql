-- Multi-branch retrofit, step 2: branchId FK columns.
-- Additive + backfilled in the same migration — every existing row already
-- belongs to the single seeded 'business-bay' branch, so this is a no-op
-- for current behavior. Run AFTER 20260624_a_create_branch_table.sql.

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'Order', 'Customer', 'Appointment', 'Invoice', 'Lead', 'Fabric',
    'Purchase', 'POSSale', 'FollowUp',
    'Measurement', 'Supplier', 'TailorMaster', 'Salesperson', 'ActivityLog'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS "branchId" TEXT', tbl);
    EXECUTE format('UPDATE %I SET "branchId" = ''business-bay'' WHERE "branchId" IS NULL', tbl);
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("branchId") REFERENCES "Branch"(id)',
      tbl, tbl || '_branchId_fkey'
    );
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I("branchId")', 'idx_' || lower(tbl) || '_branchid', tbl);
  END LOOP;
END $$;

-- ActivityLog and Supplier predate branch awareness entirely and may have
-- pre-existing rows with no sensible branch (e.g. system-level log entries
-- or shared suppliers) — leave them nullable so they're not force-fit into
-- 'business-bay'; only the directly business-owned tables get NOT NULL.
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'Order', 'Customer', 'Appointment', 'Invoice', 'Lead', 'Fabric',
    'Purchase', 'POSSale', 'FollowUp', 'Measurement', 'TailorMaster', 'Salesperson'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN "branchId" SET NOT NULL', tbl);
  END LOOP;
END $$;
