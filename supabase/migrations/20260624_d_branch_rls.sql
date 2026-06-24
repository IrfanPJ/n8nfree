-- Multi-branch retrofit, step 4: real Postgres-level branch isolation.
--
-- HOW THIS WORKS:
--   • SUPER_ADMIN queries always use the service-role key (lib/supabase.ts),
--     which has BYPASSRLS in Postgres — none of these policies apply to it,
--     by design (SUPER_ADMIN legitimately sees every branch).
--   • Everyone else (ADMIN/MANAGER/STAFF) queries through lib/supabase-scoped.ts,
--     which signs a short-lived JWT carrying { user_role, branch_ids } and
--     uses the anon key. These policies run against THAT connection and are
--     the actual enforcement — not application code.
--
-- Run AFTER 20260624_b_add_branch_id_columns.sql.

-- ── Tables with their own branchId column ─────────────────────────────────
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
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'branch_' || lower(tbl) || '_all', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated
         USING ((auth.jwt()->''branch_ids'') ? "branchId")
         WITH CHECK ((auth.jwt()->''branch_ids'') ? "branchId")',
      'branch_' || lower(tbl) || '_all', tbl
    );
  END LOOP;
END $$;

-- ── Child tables: branch is derived from the parent row ───────────────────
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "branch_orderitem_all" ON "OrderItem";
CREATE POLICY "branch_orderitem_all" ON "OrderItem" FOR ALL TO authenticated
  USING ((auth.jwt()->'branch_ids') ? (SELECT "branchId" FROM "Order" WHERE id = "OrderItem"."orderId"))
  WITH CHECK ((auth.jwt()->'branch_ids') ? (SELECT "branchId" FROM "Order" WHERE id = "OrderItem"."orderId"));

ALTER TABLE "OrderHistory" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "branch_orderhistory_all" ON "OrderHistory";
CREATE POLICY "branch_orderhistory_all" ON "OrderHistory" FOR ALL TO authenticated
  USING ((auth.jwt()->'branch_ids') ? (SELECT "branchId" FROM "Order" WHERE id = "OrderHistory"."orderId"))
  WITH CHECK ((auth.jwt()->'branch_ids') ? (SELECT "branchId" FROM "Order" WHERE id = "OrderHistory"."orderId"));

ALTER TABLE "InvoiceItem" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "branch_invoiceitem_all" ON "InvoiceItem";
CREATE POLICY "branch_invoiceitem_all" ON "InvoiceItem" FOR ALL TO authenticated
  USING ((auth.jwt()->'branch_ids') ? (SELECT "branchId" FROM "Invoice" WHERE id = "InvoiceItem"."invoiceId"))
  WITH CHECK ((auth.jwt()->'branch_ids') ? (SELECT "branchId" FROM "Invoice" WHERE id = "InvoiceItem"."invoiceId"));

ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "branch_payment_all" ON "Payment";
CREATE POLICY "branch_payment_all" ON "Payment" FOR ALL TO authenticated
  USING ((auth.jwt()->'branch_ids') ? (SELECT "branchId" FROM "Invoice" WHERE id = "Payment"."invoiceId"))
  WITH CHECK ((auth.jwt()->'branch_ids') ? (SELECT "branchId" FROM "Invoice" WHERE id = "Payment"."invoiceId"));

-- ── Global / shared tables: no branch isolation, unrestricted for any
--    authenticated user (master lists shared across all branches) ─────────
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['GarmentTypeMaster', 'CustomCountry', 'CustomCity', 'Product']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'auth_all_' || lower(tbl), tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      'auth_all_' || lower(tbl), tbl
    );
  END LOOP;
END $$;

-- ── User: not branch-owned data itself, but every Order/Appointment/etc.
--    select embeds a User join (assignedTo, staff, salesperson). The OLD
--    policies in supabase-rls-policies.sql key off current_user_id(), which
--    is never set for this client (it authenticates via JWT, not SET LOCAL),
--    so without this they'd always evaluate false and those joins would
--    silently come back null for every non-SUPER_ADMIN request. Team writes
--    (create/edit/delete members) go through the service-role client in
--    actions/users.ts and actions/auth.ts, so no write policy is needed here.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "branch_user_select" ON "User";
CREATE POLICY "branch_user_select" ON "User" FOR SELECT TO authenticated USING (true);

-- Notification keeps its existing own-row policy (current_user_id()-based,
-- unrelated to branch). Not touched here — see supabase-rls-policies.sql.
