-- Removes every leftover RLS policy from earlier, abandoned migration
-- attempts that coexisted alongside the current branch_<table>_all
-- policies. Several were unconditionally permissive (USING (true) or
-- equivalent), which silently defeated branch isolation entirely for
-- SELECT, since Postgres ORs all permissive policies together — a single
-- "true" policy grants access regardless of what any other policy says.
--
-- After this runs, the ONLY policy left on each of these tables should be
-- the branch_<table>_all one (plus branch_user_select on User, already
-- handled in 20260625_a).

DROP POLICY IF EXISTS "appt_read" ON "Appointment";
DROP POLICY IF EXISTS "appt_write" ON "Appointment";
DROP POLICY IF EXISTS "branch_appt_insert" ON "Appointment";
DROP POLICY IF EXISTS "branch_appt_select" ON "Appointment";
DROP POLICY IF EXISTS "branch_appt_update" ON "Appointment";

DROP POLICY IF EXISTS "admin_delete_customers" ON "Customer";
DROP POLICY IF EXISTS "branch_customer_insert" ON "Customer";
DROP POLICY IF EXISTS "branch_customer_select" ON "Customer";
DROP POLICY IF EXISTS "branch_customer_update" ON "Customer";
DROP POLICY IF EXISTS "customer_delete" ON "Customer";
DROP POLICY IF EXISTS "customer_read" ON "Customer";
DROP POLICY IF EXISTS "customer_update" ON "Customer";
DROP POLICY IF EXISTS "customer_write" ON "Customer";
DROP POLICY IF EXISTS "staff_read_customers" ON "Customer";
DROP POLICY IF EXISTS "staff_update_customers" ON "Customer";
DROP POLICY IF EXISTS "staff_write_customers" ON "Customer";

DROP POLICY IF EXISTS "Fabric_rw" ON "Fabric";
DROP POLICY IF EXISTS "auth_all_fabric" ON "Fabric";
DROP POLICY IF EXISTS "branch_fabric_insert" ON "Fabric";
DROP POLICY IF EXISTS "branch_fabric_select" ON "Fabric";
DROP POLICY IF EXISTS "branch_fabric_update" ON "Fabric";

DROP POLICY IF EXISTS "FollowUp_rw" ON "FollowUp";
DROP POLICY IF EXISTS "branch_followup_select" ON "FollowUp";

DROP POLICY IF EXISTS "branch_invoice_select" ON "Invoice";
DROP POLICY IF EXISTS "invoice_delete" ON "Invoice";
DROP POLICY IF EXISTS "invoice_read" ON "Invoice";
DROP POLICY IF EXISTS "invoice_update" ON "Invoice";
DROP POLICY IF EXISTS "invoice_write" ON "Invoice";

DROP POLICY IF EXISTS "Lead_rw" ON "Lead";
DROP POLICY IF EXISTS "auth_all_lead" ON "Lead";
DROP POLICY IF EXISTS "branch_lead_insert" ON "Lead";
DROP POLICY IF EXISTS "branch_lead_select" ON "Lead";
DROP POLICY IF EXISTS "branch_lead_update" ON "Lead";

DROP POLICY IF EXISTS "Measurement_rw" ON "Measurement";

DROP POLICY IF EXISTS "branch_order_insert" ON "Order";
DROP POLICY IF EXISTS "branch_order_select" ON "Order";
DROP POLICY IF EXISTS "branch_order_update" ON "Order";
DROP POLICY IF EXISTS "order_delete" ON "Order";
DROP POLICY IF EXISTS "order_read" ON "Order";
DROP POLICY IF EXISTS "order_update" ON "Order";
DROP POLICY IF EXISTS "order_write" ON "Order";
DROP POLICY IF EXISTS "staff_read_orders" ON "Order";
DROP POLICY IF EXISTS "staff_write_orders" ON "Order";

DROP POLICY IF EXISTS "POSSale_rw" ON "POSSale";
DROP POLICY IF EXISTS "auth_all_possale" ON "POSSale";

DROP POLICY IF EXISTS "Purchase_rw" ON "Purchase";
DROP POLICY IF EXISTS "branch_purchase_insert" ON "Purchase";
DROP POLICY IF EXISTS "branch_purchase_select" ON "Purchase";
DROP POLICY IF EXISTS "branch_purchase_update" ON "Purchase";

DROP POLICY IF EXISTS "Supplier_rw" ON "Supplier";
