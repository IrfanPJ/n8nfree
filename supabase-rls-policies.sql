-- ============================================================
-- Per-User Row Level Security Policies
-- Run AFTER the main migration and branch migration.
--
-- ARCHITECTURE NOTE:
-- This app uses NextAuth (not Supabase Auth), so auth.uid() is
-- always NULL. RLS is enforced via application-level claims:
--
--   SET LOCAL app.user_id  = '<uuid>';
--   SET LOCAL app.user_role = 'ADMIN';
--
-- The server-side supabase client (service role) must call
-- lib/supabase-rls.ts to set these before each query.
-- The browser-side anon client gets no elevated access.
-- ============================================================

-- ── Helper: read current user id/role from session config ────
-- Returns NULL if not set (anon / unauthenticated context)
CREATE OR REPLACE FUNCTION current_user_id() RETURNS TEXT
  LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT current_setting('app.user_id', true)
$$;

CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT
  LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT current_setting('app.user_role', true)
$$;

-- ── Setter: called via supabase.rpc('set_rls_claims', ...) ───
-- The server uses this to inject user context before queries.
CREATE OR REPLACE FUNCTION set_rls_claims(p_user_id TEXT, p_user_role TEXT)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM set_config('app.user_id',   p_user_id,   false);
  PERFORM set_config('app.user_role', p_user_role, false);
END;
$$;

-- ── Notification: users see only their own ───────────────────
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_own" ON "Notification";
CREATE POLICY "notif_own" ON "Notification"
  FOR ALL
  USING ("userId" = current_user_id())
  WITH CHECK ("userId" = current_user_id());

-- ── ActivityLog: own rows + admins/managers see all ──────────
ALTER TABLE "ActivityLog" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "actlog_read" ON "ActivityLog";
CREATE POLICY "actlog_read" ON "ActivityLog"
  FOR SELECT
  USING (
    "userId" = current_user_id()
    OR current_user_role() IN ('ADMIN', 'MANAGER')
  );

-- ActivityLog is INSERT-only from the server; no client writes
DROP POLICY IF EXISTS "actlog_insert_server" ON "ActivityLog";
CREATE POLICY "actlog_insert_server" ON "ActivityLog"
  FOR INSERT
  WITH CHECK (current_user_id() IS NOT NULL);

-- ── Customer ──────────────────────────────────────────────────
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;

-- All active staff can read
DROP POLICY IF EXISTS "customer_read" ON "Customer";
CREATE POLICY "customer_read" ON "Customer"
  FOR SELECT
  USING (current_user_id() IS NOT NULL);

-- Staff, Manager, Admin can write
DROP POLICY IF EXISTS "customer_write" ON "Customer";
CREATE POLICY "customer_write" ON "Customer"
  FOR INSERT
  WITH CHECK (current_user_role() IN ('ADMIN', 'MANAGER', 'STAFF'));

DROP POLICY IF EXISTS "customer_update" ON "Customer";
CREATE POLICY "customer_update" ON "Customer"
  FOR UPDATE
  USING (current_user_role() IN ('ADMIN', 'MANAGER', 'STAFF'));

-- Only Admin/Manager can soft-delete (set isActive = false)
DROP POLICY IF EXISTS "customer_delete" ON "Customer";
CREATE POLICY "customer_delete" ON "Customer"
  FOR DELETE
  USING (current_user_role() IN ('ADMIN', 'MANAGER'));

-- ── Order ─────────────────────────────────────────────────────
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_read" ON "Order";
CREATE POLICY "order_read" ON "Order"
  FOR SELECT
  USING (current_user_id() IS NOT NULL);

DROP POLICY IF EXISTS "order_write" ON "Order";
CREATE POLICY "order_write" ON "Order"
  FOR INSERT
  WITH CHECK (current_user_role() IN ('ADMIN', 'MANAGER', 'STAFF'));

DROP POLICY IF EXISTS "order_update" ON "Order";
CREATE POLICY "order_update" ON "Order"
  FOR UPDATE
  USING (current_user_id() IS NOT NULL);

DROP POLICY IF EXISTS "order_delete" ON "Order";
CREATE POLICY "order_delete" ON "Order"
  FOR DELETE
  USING (current_user_role() IN ('ADMIN', 'MANAGER'));

-- ── User: readable by all staff; writable by ADMIN only ──────
-- Note: no self-referencing subquery to avoid recursion.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_read" ON "User";
CREATE POLICY "user_read" ON "User"
  FOR SELECT
  USING (current_user_id() IS NOT NULL);

DROP POLICY IF EXISTS "user_write" ON "User";
CREATE POLICY "user_write" ON "User"
  FOR ALL
  USING (current_user_role() = 'ADMIN')
  WITH CHECK (current_user_role() = 'ADMIN');

-- ── Appointment ───────────────────────────────────────────────
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appt_read" ON "Appointment";
CREATE POLICY "appt_read" ON "Appointment"
  FOR SELECT USING (current_user_id() IS NOT NULL);

DROP POLICY IF EXISTS "appt_write" ON "Appointment";
CREATE POLICY "appt_write" ON "Appointment"
  FOR ALL
  USING (current_user_id() IS NOT NULL)
  WITH CHECK (current_user_id() IS NOT NULL);

-- ── Invoice ───────────────────────────────────────────────────
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_read" ON "Invoice";
CREATE POLICY "invoice_read" ON "Invoice"
  FOR SELECT USING (current_user_id() IS NOT NULL);

DROP POLICY IF EXISTS "invoice_write" ON "Invoice";
CREATE POLICY "invoice_write" ON "Invoice"
  FOR INSERT WITH CHECK (current_user_role() IN ('ADMIN', 'MANAGER', 'STAFF'));

DROP POLICY IF EXISTS "invoice_update" ON "Invoice";
CREATE POLICY "invoice_update" ON "Invoice"
  FOR UPDATE USING (current_user_role() IN ('ADMIN', 'MANAGER', 'STAFF'));

DROP POLICY IF EXISTS "invoice_delete" ON "Invoice";
CREATE POLICY "invoice_delete" ON "Invoice"
  FOR DELETE USING (current_user_role() = 'ADMIN');

-- ── Remaining tables: authenticated read/write ───────────────
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'Lead', 'Fabric', 'Purchase', 'Supplier',
    'Measurement', 'FollowUp', 'OrderHistory',
    'InvoiceItem', 'Payment', 'POSSale'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I',
      tbl || '_rw', tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (current_user_id() IS NOT NULL) WITH CHECK (current_user_id() IS NOT NULL)',
      tbl || '_rw', tbl
    );
  END LOOP;
END $$;

-- ── Enable Realtime on Notification ──────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'Notification'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";
  END IF;
END $$;
