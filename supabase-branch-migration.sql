-- ============================================================
-- Branch Support Migration
-- Run in Supabase SQL Editor after the main migration.
-- ============================================================

-- 1. Add branch column to core tables
ALTER TABLE "Order"       ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT 'Main';
ALTER TABLE "Customer"    ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT 'Main';
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT 'Main';
ALTER TABLE "Invoice"     ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT 'Main';
ALTER TABLE "Lead"        ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT 'Main';
ALTER TABLE "Fabric"      ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT 'Main';
ALTER TABLE "Purchase"    ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT 'Main';
ALTER TABLE "POSSale"     ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT 'Main';

-- 2. Add branch to User for default branch assignment
ALTER TABLE "User"        ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT 'Main';

-- 3. Indexes for branch filtering
CREATE INDEX IF NOT EXISTS idx_order_branch       ON "Order"(branch);
CREATE INDEX IF NOT EXISTS idx_customer_branch    ON "Customer"(branch);
CREATE INDEX IF NOT EXISTS idx_appointment_branch ON "Appointment"(branch);
CREATE INDEX IF NOT EXISTS idx_invoice_branch     ON "Invoice"(branch);
CREATE INDEX IF NOT EXISTS idx_lead_branch        ON "Lead"(branch);
CREATE INDEX IF NOT EXISTS idx_fabric_branch      ON "Fabric"(branch);

-- 4. Default branches (edit as needed for your business)
-- Branch names: 'Main', 'Business Bay', 'Dubai Silicon Oasis', 'Sharjah'
