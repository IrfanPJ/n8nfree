-- ─────────────────────────────────────────────────────────────────────────────
-- Branch isolation via Row Level Security
--
-- HOW IT WORKS:
--   • Service-role key (used by ADMIN/MANAGER server actions) bypasses RLS entirely.
--   • Staff server actions use a custom JWT containing { branch, user_role }.
--   • Policies below apply to the "authenticated" role (custom JWT users only).
--   • Result: DB physically enforces branch isolation for non-admin users.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Order ────────────────────────────────────────────────────────────────────
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branch_order_select" ON "Order";
DROP POLICY IF EXISTS "branch_order_insert" ON "Order";
DROP POLICY IF EXISTS "branch_order_update" ON "Order";

CREATE POLICY "branch_order_select" ON "Order"
  FOR SELECT TO authenticated
  USING (branch = (auth.jwt() ->> 'branch'));

CREATE POLICY "branch_order_insert" ON "Order"
  FOR INSERT TO authenticated
  WITH CHECK (branch = (auth.jwt() ->> 'branch'));

CREATE POLICY "branch_order_update" ON "Order"
  FOR UPDATE TO authenticated
  USING (branch = (auth.jwt() ->> 'branch'))
  WITH CHECK (branch = (auth.jwt() ->> 'branch'));

-- ── Customer ─────────────────────────────────────────────────────────────────
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branch_customer_select" ON "Customer";
DROP POLICY IF EXISTS "branch_customer_insert" ON "Customer";
DROP POLICY IF EXISTS "branch_customer_update" ON "Customer";

CREATE POLICY "branch_customer_select" ON "Customer"
  FOR SELECT TO authenticated
  USING (branch = (auth.jwt() ->> 'branch'));

CREATE POLICY "branch_customer_insert" ON "Customer"
  FOR INSERT TO authenticated
  WITH CHECK (branch = (auth.jwt() ->> 'branch'));

CREATE POLICY "branch_customer_update" ON "Customer"
  FOR UPDATE TO authenticated
  USING (branch = (auth.jwt() ->> 'branch'))
  WITH CHECK (branch = (auth.jwt() ->> 'branch'));

-- ── Lead ─────────────────────────────────────────────────────────────────────
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branch_lead_select" ON "Lead";
DROP POLICY IF EXISTS "branch_lead_insert" ON "Lead";
DROP POLICY IF EXISTS "branch_lead_update" ON "Lead";

CREATE POLICY "branch_lead_select" ON "Lead"
  FOR SELECT TO authenticated
  USING (branch = (auth.jwt() ->> 'branch'));

CREATE POLICY "branch_lead_insert" ON "Lead"
  FOR INSERT TO authenticated
  WITH CHECK (branch = (auth.jwt() ->> 'branch'));

CREATE POLICY "branch_lead_update" ON "Lead"
  FOR UPDATE TO authenticated
  USING (branch = (auth.jwt() ->> 'branch'))
  WITH CHECK (branch = (auth.jwt() ->> 'branch'));

-- ── Appointment ──────────────────────────────────────────────────────────────
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branch_appt_select" ON "Appointment";
DROP POLICY IF EXISTS "branch_appt_insert" ON "Appointment";
DROP POLICY IF EXISTS "branch_appt_update" ON "Appointment";

CREATE POLICY "branch_appt_select" ON "Appointment"
  FOR SELECT TO authenticated
  USING (branch = (auth.jwt() ->> 'branch'));

CREATE POLICY "branch_appt_insert" ON "Appointment"
  FOR INSERT TO authenticated
  WITH CHECK (branch = (auth.jwt() ->> 'branch'));

CREATE POLICY "branch_appt_update" ON "Appointment"
  FOR UPDATE TO authenticated
  USING (branch = (auth.jwt() ->> 'branch'))
  WITH CHECK (branch = (auth.jwt() ->> 'branch'));

-- ── Fabric ───────────────────────────────────────────────────────────────────
ALTER TABLE "Fabric" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branch_fabric_select" ON "Fabric";
DROP POLICY IF EXISTS "branch_fabric_insert" ON "Fabric";
DROP POLICY IF EXISTS "branch_fabric_update" ON "Fabric";

CREATE POLICY "branch_fabric_select" ON "Fabric"
  FOR SELECT TO authenticated
  USING (branch = (auth.jwt() ->> 'branch'));

CREATE POLICY "branch_fabric_insert" ON "Fabric"
  FOR INSERT TO authenticated
  WITH CHECK (branch = (auth.jwt() ->> 'branch'));

CREATE POLICY "branch_fabric_update" ON "Fabric"
  FOR UPDATE TO authenticated
  USING (branch = (auth.jwt() ->> 'branch'))
  WITH CHECK (branch = (auth.jwt() ->> 'branch'));

-- ── Purchase ─────────────────────────────────────────────────────────────────
ALTER TABLE "Purchase" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branch_purchase_select" ON "Purchase";
DROP POLICY IF EXISTS "branch_purchase_insert" ON "Purchase";
DROP POLICY IF EXISTS "branch_purchase_update" ON "Purchase";

CREATE POLICY "branch_purchase_select" ON "Purchase"
  FOR SELECT TO authenticated
  USING (branch = (auth.jwt() ->> 'branch'));

CREATE POLICY "branch_purchase_insert" ON "Purchase"
  FOR INSERT TO authenticated
  WITH CHECK (branch = (auth.jwt() ->> 'branch'));

CREATE POLICY "branch_purchase_update" ON "Purchase"
  FOR UPDATE TO authenticated
  USING (branch = (auth.jwt() ->> 'branch'))
  WITH CHECK (branch = (auth.jwt() ->> 'branch'));

-- ── Invoice (no branch column — uses parent Order's branch) ──────────────────
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branch_invoice_select" ON "Invoice";

CREATE POLICY "branch_invoice_select" ON "Invoice"
  FOR SELECT TO authenticated
  USING (
    (SELECT branch FROM "Order" WHERE id = "Invoice"."orderId") = (auth.jwt() ->> 'branch')
  );

-- ── OrderItem (accessed only via Order joins — covers reads implicitly) ───────
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branch_orderitem_select" ON "OrderItem";

CREATE POLICY "branch_orderitem_select" ON "OrderItem"
  FOR SELECT TO authenticated
  USING (
    (SELECT branch FROM "Order" WHERE id = "OrderItem"."orderId") = (auth.jwt() ->> 'branch')
  );

-- ── OrderHistory ─────────────────────────────────────────────────────────────
ALTER TABLE "OrderHistory" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branch_orderhistory_select" ON "OrderHistory";

CREATE POLICY "branch_orderhistory_select" ON "OrderHistory"
  FOR SELECT TO authenticated
  USING (
    (SELECT branch FROM "Order" WHERE id = "OrderHistory"."orderId") = (auth.jwt() ->> 'branch')
  );

-- ── FollowUp (via Lead) ───────────────────────────────────────────────────────
ALTER TABLE "FollowUp" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branch_followup_select" ON "FollowUp";

CREATE POLICY "branch_followup_select" ON "FollowUp"
  FOR SELECT TO authenticated
  USING (
    (SELECT branch FROM "Lead" WHERE id = "FollowUp"."leadId") = (auth.jwt() ->> 'branch')
  );
