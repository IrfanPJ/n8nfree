-- ============================================================
-- House of Tailors CRM — Complete Supabase SQL
-- ============================================================
-- Run this file in Supabase SQL Editor (Dashboard → SQL Editor)
-- for a fresh setup, OR run the labelled sections individually
-- when applying to an existing database.
--
-- ORDER OF EXECUTION:
--   1. Core schema   — base tables (Prisma-managed, run prisma db push first)
--   2. Extra tables  — Lead, Fabric, Product, POSSale
--   3. Column adds   — branch, position
--   4. Order status  — migrate old → new statuses (skip on fresh DB)
--   5. Indexes       — performance
--   6. RLS           — row-level security + helper functions
--   7. Realtime      — enable Notification pub
--   8. Seed data     — optional demo data
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- SECTION 1 — EXTRA TABLES
-- (Core tables — User, Customer, Order, Measurement, etc. —
--  are created by Prisma. Run `npx prisma db push` first.)
-- ════════════════════════════════════════════════════════════

-- ── Lead ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Lead" (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  interest    TEXT,
  stage       TEXT NOT NULL DEFAULT 'ENQUIRY',
  notes       TEXT,
  value       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  source      TEXT,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Fabric ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Fabric" (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL,
  color           TEXT,
  "stockQty"      NUMERIC(10, 2) NOT NULL DEFAULT 0,
  "reorderLevel"  NUMERIC(10, 2) NOT NULL DEFAULT 5,
  supplier        TEXT,
  "pricePerUnit"  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unit            TEXT NOT NULL DEFAULT 'm',
  notes           TEXT,
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Product (POS) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Product" (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  price       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  category    TEXT NOT NULL,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── POSSale ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "POSSale" (
  id              TEXT PRIMARY KEY,
  "receiptNo"     TEXT NOT NULL,
  "clientName"    TEXT,
  items           JSONB NOT NULL DEFAULT '[]',
  subtotal        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax             NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ════════════════════════════════════════════════════════════
-- SECTION 2 — COLUMN ADDITIONS
-- ════════════════════════════════════════════════════════════

-- ── Branch column (multi-location support) ────────────────────
ALTER TABLE "Order"       ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT 'Main';
ALTER TABLE "Customer"    ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT 'Main';
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT 'Main';
ALTER TABLE "Invoice"     ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT 'Main';
ALTER TABLE "Lead"        ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT 'Main';
ALTER TABLE "Fabric"      ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT 'Main';
ALTER TABLE "Purchase"    ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT 'Main';
ALTER TABLE "POSSale"     ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT 'Main';
ALTER TABLE "User"        ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT 'Main';

-- ── Position column (job function, separate from role/access) ─
-- Valid values: SALES_STAFF | PURCHASE_STAFF | PRODUCTION_IN_CHARGE |
--               MASTER | TAILOR | QUALITY_CHECK |
--               LOGISTICS_COORDINATOR | LEAD_MANAGEMENT_STAFF
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "position" TEXT DEFAULT NULL;

-- Backfill: existing TAILOR role → STAFF role + TAILOR position
UPDATE "User" SET "position" = 'TAILOR' WHERE "role" = 'TAILOR';
UPDATE "User" SET "role"     = 'STAFF'  WHERE "role" = 'TAILOR';


-- ════════════════════════════════════════════════════════════
-- SECTION 3 — ORDER STATUS MIGRATION
-- Skip this section on a fresh database.
-- Only needed when migrating from the old 8-status set
-- (PENDING/MEASURING/CUTTING/STITCHING/TRIAL/READY/DELIVERED/CANCELLED)
-- to the new 12-status set.
-- ════════════════════════════════════════════════════════════

-- Step 3a: Drop defaults that depend on the enum
ALTER TABLE "Order"        ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "OrderHistory" ALTER COLUMN status DROP DEFAULT;

-- Step 3b: Detach columns from enum (convert to text)
ALTER TABLE "Order"        ALTER COLUMN status TYPE text;
ALTER TABLE "OrderHistory" ALTER COLUMN status TYPE text;

-- Step 3c: Migrate data
UPDATE "Order"
SET status = CASE status
  WHEN 'PENDING'    THEN 'MEASUREMENT'
  WHEN 'MEASURING'  THEN 'MEASUREMENT'
  WHEN 'CUTTING'    THEN 'CUTTING'
  WHEN 'STITCHING'  THEN 'SEMI_STITCH'
  WHEN 'TRIAL'      THEN 'TRIAL'
  WHEN 'READY'      THEN 'READY_FOR_DELIVERY'
  WHEN 'DELIVERED'  THEN 'DELIVERED'
  WHEN 'CANCELLED'  THEN 'ORDER_CLOSED'
  ELSE status
END
WHERE status IN ('PENDING','MEASURING','CUTTING','STITCHING','TRIAL','READY','DELIVERED','CANCELLED');

UPDATE "OrderHistory"
SET status = CASE status
  WHEN 'PENDING'    THEN 'MEASUREMENT'
  WHEN 'MEASURING'  THEN 'MEASUREMENT'
  WHEN 'CUTTING'    THEN 'CUTTING'
  WHEN 'STITCHING'  THEN 'SEMI_STITCH'
  WHEN 'TRIAL'      THEN 'TRIAL'
  WHEN 'READY'      THEN 'READY_FOR_DELIVERY'
  WHEN 'DELIVERED'  THEN 'DELIVERED'
  WHEN 'CANCELLED'  THEN 'ORDER_CLOSED'
  ELSE status
END
WHERE status IN ('PENDING','MEASURING','CUTTING','STITCHING','TRIAL','READY','DELIVERED','CANCELLED');

-- Step 3d: Drop old enum, create new one with 12 values
DROP TYPE IF EXISTS "OrderStatus";

CREATE TYPE "OrderStatus" AS ENUM (
  'MEASUREMENT',
  'FABRIC_ORDERING',
  'FABRIC_COLLECTED',
  'CUTTING',
  'SEMI_STITCH',
  'TRIAL',
  'FINAL_STITCH',
  'READY_FOR_DELIVERY',
  'DELIVERED',
  'PENDING_ALTERATION',
  'READY_FINAL_DELIVERY',
  'ORDER_CLOSED'
);

-- Step 3e: Restore columns to new enum
ALTER TABLE "Order"
  ALTER COLUMN status TYPE "OrderStatus" USING status::"OrderStatus";

ALTER TABLE "OrderHistory"
  ALTER COLUMN status TYPE "OrderStatus" USING status::"OrderStatus";

-- Step 3f: Restore default
ALTER TABLE "Order"
  ALTER COLUMN status SET DEFAULT 'MEASUREMENT'::"OrderStatus";


-- ════════════════════════════════════════════════════════════
-- SECTION 4 — INDEXES
-- ════════════════════════════════════════════════════════════

-- Order
CREATE INDEX IF NOT EXISTS idx_order_status       ON "Order"(status);
CREATE INDEX IF NOT EXISTS idx_order_customer     ON "Order"("customerId");
CREATE INDEX IF NOT EXISTS idx_order_delivery     ON "Order"("deliveryDate");
CREATE INDEX IF NOT EXISTS idx_order_priority     ON "Order"(priority);
CREATE INDEX IF NOT EXISTS idx_order_active       ON "Order"("isActive");
CREATE INDEX IF NOT EXISTS idx_order_created      ON "Order"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_order_branch       ON "Order"(branch);

-- Customer
CREATE INDEX IF NOT EXISTS idx_customer_name      ON "Customer"(name);
CREATE INDEX IF NOT EXISTS idx_customer_phone     ON "Customer"(phone);
CREATE INDEX IF NOT EXISTS idx_customer_email     ON "Customer"(email);
CREATE INDEX IF NOT EXISTS idx_customer_active    ON "Customer"("isActive");
CREATE INDEX IF NOT EXISTS idx_customer_vip       ON "Customer"("isVIP");
CREATE INDEX IF NOT EXISTS idx_customer_branch    ON "Customer"(branch);

-- Appointment
CREATE INDEX IF NOT EXISTS idx_appt_start         ON "Appointment"("startTime");
CREATE INDEX IF NOT EXISTS idx_appt_customer      ON "Appointment"("customerId");
CREATE INDEX IF NOT EXISTS idx_appt_status        ON "Appointment"(status);
CREATE INDEX IF NOT EXISTS idx_appt_staff         ON "Appointment"("staffId");
CREATE INDEX IF NOT EXISTS idx_appointment_branch ON "Appointment"(branch);

-- Invoice
CREATE INDEX IF NOT EXISTS idx_invoice_customer   ON "Invoice"("customerId");
CREATE INDEX IF NOT EXISTS idx_invoice_status     ON "Invoice"(status);
CREATE INDEX IF NOT EXISTS idx_invoice_due        ON "Invoice"("dueDate");
CREATE INDEX IF NOT EXISTS idx_invoice_order      ON "Invoice"("orderId");
CREATE INDEX IF NOT EXISTS idx_invoice_branch     ON "Invoice"(branch);

-- Lead
CREATE INDEX IF NOT EXISTS idx_lead_stage         ON "Lead"(stage);
CREATE INDEX IF NOT EXISTS idx_lead_active        ON "Lead"("isActive");
CREATE INDEX IF NOT EXISTS idx_lead_branch        ON "Lead"(branch);

-- Fabric
CREATE INDEX IF NOT EXISTS idx_fabric_name        ON "Fabric"(name);
CREATE INDEX IF NOT EXISTS idx_fabric_active      ON "Fabric"("isActive");
CREATE INDEX IF NOT EXISTS idx_fabric_branch      ON "Fabric"(branch);

-- ActivityLog
CREATE INDEX IF NOT EXISTS idx_actlog_user        ON "ActivityLog"("userId");
CREATE INDEX IF NOT EXISTS idx_actlog_customer    ON "ActivityLog"("customerId");
CREATE INDEX IF NOT EXISTS idx_actlog_created     ON "ActivityLog"("createdAt" DESC);

-- Notification
CREATE INDEX IF NOT EXISTS idx_notif_user         ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS idx_notif_read         ON "Notification"("isRead");

-- OrderHistory
CREATE INDEX IF NOT EXISTS idx_orderhist_order    ON "OrderHistory"("orderId");

-- Measurement
CREATE INDEX IF NOT EXISTS idx_measurement_cust   ON "Measurement"("customerId");

-- FollowUp
CREATE INDEX IF NOT EXISTS idx_followup_customer  ON "FollowUp"("customerId");
CREATE INDEX IF NOT EXISTS idx_followup_status    ON "FollowUp"(status);
CREATE INDEX IF NOT EXISTS idx_followup_due       ON "FollowUp"("dueDate");

-- Purchase
CREATE INDEX IF NOT EXISTS idx_purchase_date      ON "Purchase"("purchaseDate" DESC);

-- Payment
CREATE INDEX IF NOT EXISTS idx_payment_invoice    ON "Payment"("invoiceId");


-- ════════════════════════════════════════════════════════════
-- SECTION 5 — RLS HELPER FUNCTIONS
-- ════════════════════════════════════════════════════════════
-- This app uses NextAuth (not Supabase Auth), so auth.uid() is
-- always NULL. RLS is enforced via app-level session config:
--   SET LOCAL app.user_id  = '<uuid>';
--   SET LOCAL app.user_role = 'ADMIN';

CREATE OR REPLACE FUNCTION current_user_id() RETURNS TEXT
  LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT current_setting('app.user_id', true)
$$;

CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT
  LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT current_setting('app.user_role', true)
$$;

CREATE OR REPLACE FUNCTION set_rls_claims(p_user_id TEXT, p_user_role TEXT)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM set_config('app.user_id',   p_user_id,   false);
  PERFORM set_config('app.user_role', p_user_role, false);
END;
$$;


-- ════════════════════════════════════════════════════════════
-- SECTION 6 — ROW LEVEL SECURITY POLICIES
-- ════════════════════════════════════════════════════════════

-- ── Notification: users see only their own ───────────────────
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif_own" ON "Notification";
CREATE POLICY "notif_own" ON "Notification"
  FOR ALL
  USING ("userId" = current_user_id())
  WITH CHECK ("userId" = current_user_id());

-- ── ActivityLog ───────────────────────────────────────────────
ALTER TABLE "ActivityLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "actlog_read" ON "ActivityLog";
CREATE POLICY "actlog_read" ON "ActivityLog"
  FOR SELECT
  USING (
    "userId" = current_user_id()
    OR current_user_role() IN ('ADMIN', 'MANAGER')
  );
DROP POLICY IF EXISTS "actlog_insert_server" ON "ActivityLog";
CREATE POLICY "actlog_insert_server" ON "ActivityLog"
  FOR INSERT
  WITH CHECK (current_user_id() IS NOT NULL);

-- ── Customer ──────────────────────────────────────────────────
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_read"   ON "Customer";
DROP POLICY IF EXISTS "customer_write"  ON "Customer";
DROP POLICY IF EXISTS "customer_update" ON "Customer";
DROP POLICY IF EXISTS "customer_delete" ON "Customer";
CREATE POLICY "customer_read"   ON "Customer" FOR SELECT USING (current_user_id() IS NOT NULL);
CREATE POLICY "customer_write"  ON "Customer" FOR INSERT WITH CHECK (current_user_role() IN ('ADMIN','MANAGER','STAFF'));
CREATE POLICY "customer_update" ON "Customer" FOR UPDATE USING (current_user_role() IN ('ADMIN','MANAGER','STAFF'));
CREATE POLICY "customer_delete" ON "Customer" FOR DELETE USING (current_user_role() IN ('ADMIN','MANAGER'));

-- ── Order ─────────────────────────────────────────────────────
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_read"   ON "Order";
DROP POLICY IF EXISTS "order_write"  ON "Order";
DROP POLICY IF EXISTS "order_update" ON "Order";
DROP POLICY IF EXISTS "order_delete" ON "Order";
CREATE POLICY "order_read"   ON "Order" FOR SELECT USING (current_user_id() IS NOT NULL);
CREATE POLICY "order_write"  ON "Order" FOR INSERT WITH CHECK (current_user_role() IN ('ADMIN','MANAGER','STAFF'));
CREATE POLICY "order_update" ON "Order" FOR UPDATE USING (current_user_id() IS NOT NULL);
CREATE POLICY "order_delete" ON "Order" FOR DELETE USING (current_user_role() IN ('ADMIN','MANAGER'));

-- ── User ──────────────────────────────────────────────────────
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_read"  ON "User";
DROP POLICY IF EXISTS "user_write" ON "User";
CREATE POLICY "user_read"  ON "User" FOR SELECT USING (current_user_id() IS NOT NULL);
CREATE POLICY "user_write" ON "User" FOR ALL
  USING (current_user_role() = 'ADMIN')
  WITH CHECK (current_user_role() = 'ADMIN');

-- ── Appointment ───────────────────────────────────────────────
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "appt_read"  ON "Appointment";
DROP POLICY IF EXISTS "appt_write" ON "Appointment";
CREATE POLICY "appt_read"  ON "Appointment" FOR SELECT USING (current_user_id() IS NOT NULL);
CREATE POLICY "appt_write" ON "Appointment" FOR ALL
  USING (current_user_id() IS NOT NULL)
  WITH CHECK (current_user_id() IS NOT NULL);

-- ── Invoice ───────────────────────────────────────────────────
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoice_read"   ON "Invoice";
DROP POLICY IF EXISTS "invoice_write"  ON "Invoice";
DROP POLICY IF EXISTS "invoice_update" ON "Invoice";
DROP POLICY IF EXISTS "invoice_delete" ON "Invoice";
CREATE POLICY "invoice_read"   ON "Invoice" FOR SELECT USING (current_user_id() IS NOT NULL);
CREATE POLICY "invoice_write"  ON "Invoice" FOR INSERT WITH CHECK (current_user_role() IN ('ADMIN','MANAGER','STAFF'));
CREATE POLICY "invoice_update" ON "Invoice" FOR UPDATE USING (current_user_role() IN ('ADMIN','MANAGER','STAFF'));
CREATE POLICY "invoice_delete" ON "Invoice" FOR DELETE USING (current_user_role() = 'ADMIN');

-- ── Remaining tables: authenticated read/write ───────────────
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'Lead', 'Fabric', 'Purchase', 'Supplier',
    'Measurement', 'FollowUp', 'OrderHistory',
    'InvoiceItem', 'Payment', 'POSSale', 'Product'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_rw', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (current_user_id() IS NOT NULL) WITH CHECK (current_user_id() IS NOT NULL)',
      tbl || '_rw', tbl
    );
  END LOOP;
END $$;


-- ════════════════════════════════════════════════════════════
-- SECTION 7 — REALTIME
-- ════════════════════════════════════════════════════════════

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


-- ════════════════════════════════════════════════════════════
-- SECTION 8 — SEED DATA (optional demo data)
-- Safe to re-run (ON CONFLICT DO NOTHING).
-- Skip this section in production.
-- ════════════════════════════════════════════════════════════

-- ── 10 Customers ─────────────────────────────────────────────
INSERT INTO "Customer" (id, name, email, phone, address, city, gender, "isVIP", "isActive", tags, "createdAt", "updatedAt") VALUES
  ('seed-cust-001', 'Arjun Sharma',    'arjun@example.com',   '9876543210', '12 MG Road',        'Mumbai',    'MALE',   true,  true, ARRAY['suit','wedding']::text[],  NOW()-INTERVAL'60 days', NOW()),
  ('seed-cust-002', 'Priya Patel',     'priya@example.com',   '9876543211', '45 Park Street',    'Delhi',     'FEMALE', false, true, ARRAY[]::text[],                  NOW()-INTERVAL'55 days', NOW()),
  ('seed-cust-003', 'Rohit Mehta',     'rohit@example.com',   '9876543212', '7 Linking Road',    'Mumbai',    'MALE',   false, true, ARRAY['ethnic']::text[],          NOW()-INTERVAL'50 days', NOW()),
  ('seed-cust-004', 'Sneha Joshi',     'sneha@example.com',   '9876543213', '22 Anna Salai',     'Chennai',   'FEMALE', true,  true, ARRAY['vip','wedding']::text[],   NOW()-INTERVAL'45 days', NOW()),
  ('seed-cust-005', 'Vikram Kapoor',   'vikram@example.com',  '9876543214', '88 Race Course Rd', 'Bangalore', 'MALE',   true,  true, ARRAY['wedding','suit']::text[],  NOW()-INTERVAL'40 days', NOW()),
  ('seed-cust-006', 'Anita Desai',     'anita@example.com',   '9876543215', '3 Civil Lines',     'Jaipur',    'FEMALE', false, true, ARRAY[]::text[],                  NOW()-INTERVAL'35 days', NOW()),
  ('seed-cust-007', 'Rahul Singhania', 'rahul@example.com',   '9876543216', '56 Bandra West',    'Mumbai',    'MALE',   false, true, ARRAY['casual']::text[],          NOW()-INTERVAL'30 days', NOW()),
  ('seed-cust-008', 'Meera Nair',      'meera@example.com',   '9876543217', '19 Indiranagar',    'Bangalore', 'FEMALE', false, true, ARRAY[]::text[],                  NOW()-INTERVAL'25 days', NOW()),
  ('seed-cust-009', 'Kabir Khan',      'kabir@example.com',   '9876543218', '4 Model Town',      'Delhi',     'MALE',   true,  true, ARRAY['vip','wedding']::text[],   NOW()-INTERVAL'20 days', NOW()),
  ('seed-cust-010', 'Divya Reddy',     'divya@example.com',   '9876543219', '31 Jubilee Hills',  'Hyderabad', 'FEMALE', false, true, ARRAY[]::text[],                  NOW()-INTERVAL'15 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ── 10 Orders ────────────────────────────────────────────────
INSERT INTO "Order" (id, "orderNumber", "customerId", status, priority, "garmentType", "orderDate", "deliveryDate", "advanceAmount", "totalAmount", "isActive", "imageUrls", "createdAt", "updatedAt") VALUES
  ('seed-ord-001', 'HOT-2026-001', 'seed-cust-001', 'SEMI_STITCH',        'HIGH',   'Bespoke Suit',       NOW()-INTERVAL'30 days', NOW()+INTERVAL'5 days',  10000, 28000, true, ARRAY[]::text[], NOW()-INTERVAL'30 days', NOW()),
  ('seed-ord-002', 'HOT-2026-002', 'seed-cust-002', 'READY_FOR_DELIVERY', 'NORMAL', 'Evening Gown',       NOW()-INTERVAL'25 days', NOW()+INTERVAL'2 days',   5000, 15000, true, ARRAY[]::text[], NOW()-INTERVAL'25 days', NOW()),
  ('seed-ord-003', 'HOT-2026-003', 'seed-cust-003', 'DELIVERED',          'NORMAL', 'Sherwani',           NOW()-INTERVAL'45 days', NOW()-INTERVAL'5 days',  12000, 32000, true, ARRAY[]::text[], NOW()-INTERVAL'45 days', NOW()),
  ('seed-ord-004', 'HOT-2026-004', 'seed-cust-004', 'TRIAL',              'HIGH',   'Wedding Lehenga',    NOW()-INTERVAL'20 days', NOW()+INTERVAL'10 days', 15000, 45000, true, ARRAY[]::text[], NOW()-INTERVAL'20 days', NOW()),
  ('seed-ord-005', 'HOT-2026-005', 'seed-cust-005', 'CUTTING',            'URGENT', 'Three-Piece Suit',   NOW()-INTERVAL'10 days', NOW()+INTERVAL'3 days',   8000, 35000, true, ARRAY[]::text[], NOW()-INTERVAL'10 days', NOW()),
  ('seed-ord-006', 'HOT-2026-006', 'seed-cust-006', 'MEASUREMENT',        'NORMAL', 'Salwar Kameez',      NOW()-INTERVAL'5 days',  NOW()+INTERVAL'20 days',  2000,  8000, true, ARRAY[]::text[], NOW()-INTERVAL'5 days',  NOW()),
  ('seed-ord-007', 'HOT-2026-007', 'seed-cust-007', 'FABRIC_ORDERING',    'LOW',    'Casual Shirts x3',   NOW()-INTERVAL'3 days',  NOW()+INTERVAL'14 days',  3000,  9000, true, ARRAY[]::text[], NOW()-INTERVAL'3 days',  NOW()),
  ('seed-ord-008', 'HOT-2026-008', 'seed-cust-008', 'SEMI_STITCH',        'NORMAL', 'Kurta Pajama',       NOW()-INTERVAL'8 days',  NOW()+INTERVAL'6 days',   2500,  6000, true, ARRAY[]::text[], NOW()-INTERVAL'8 days',  NOW()),
  ('seed-ord-009', 'HOT-2026-009', 'seed-cust-009', 'DELIVERED',          'HIGH',   'Reception Sherwani', NOW()-INTERVAL'60 days', NOW()-INTERVAL'15 days', 20000, 55000, true, ARRAY[]::text[], NOW()-INTERVAL'60 days', NOW()),
  ('seed-ord-010', 'HOT-2026-010', 'seed-cust-010', 'READY_FOR_DELIVERY', 'NORMAL', 'Office Suit',        NOW()-INTERVAL'15 days', NOW()+INTERVAL'1 days',   5000, 22000, true, ARRAY[]::text[], NOW()-INTERVAL'15 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ── 5 Appointments ───────────────────────────────────────────
INSERT INTO "Appointment" (id, "customerId", title, status, type, "startTime", "endTime", "isActive", "createdAt", "updatedAt") VALUES
  ('seed-appt-001', 'seed-cust-001', 'Final Fitting — Bespoke Suit',    'CONFIRMED', 'FITTING',      NOW()+INTERVAL'1 day 10 hours',  NOW()+INTERVAL'1 day 11 hours',  true, NOW()-INTERVAL'5 days', NOW()),
  ('seed-appt-002', 'seed-cust-004', 'Trial — Wedding Lehenga',         'SCHEDULED', 'TRIAL',        NOW()+INTERVAL'3 days 14 hours', NOW()+INTERVAL'3 days 15 hours', true, NOW()-INTERVAL'3 days', NOW()),
  ('seed-appt-003', 'seed-cust-007', 'Measurement Session',             'CONFIRMED', 'MEASUREMENT',  NOW()+INTERVAL'2 days 11 hours', NOW()+INTERVAL'2 days 12 hours', true, NOW()-INTERVAL'2 days', NOW()),
  ('seed-appt-004', 'seed-cust-002', 'Delivery — Evening Gown',         'SCHEDULED', 'DELIVERY',     NOW()+INTERVAL'2 days 16 hours', NOW()+INTERVAL'2 days 17 hours', true, NOW()-INTERVAL'1 day',  NOW()),
  ('seed-appt-005', 'seed-cust-005', 'Consultation — New Order',        'SCHEDULED', 'CONSULTATION', NOW()+INTERVAL'5 days 10 hours', NOW()+INTERVAL'5 days 11 hours', true, NOW(),                  NOW())
ON CONFLICT (id) DO NOTHING;

-- ── 5 Invoices ───────────────────────────────────────────────
INSERT INTO "Invoice" (id, "invoiceNumber", "customerId", "orderId", status, subtotal, "discountValue", "taxRate", "taxAmount", "totalAmount", "paidAmount", "dueAmount", "isActive", "createdAt", "updatedAt") VALUES
  ('seed-inv-001', 'INV-2026-001', 'seed-cust-001', 'seed-ord-001', 'PARTIAL', 28000, 0,    18, 5040, 33040, 10000,     0, true, NOW()-INTERVAL'30 days', NOW()),
  ('seed-inv-002', 'INV-2026-002', 'seed-cust-003', 'seed-ord-003', 'PAID',    32000, 2000, 18, 5400, 35400, 35400,     0, true, NOW()-INTERVAL'45 days', NOW()),
  ('seed-inv-003', 'INV-2026-003', 'seed-cust-009', 'seed-ord-009', 'PAID',    55000, 5000, 18, 9000, 59000, 59000,     0, true, NOW()-INTERVAL'60 days', NOW()),
  ('seed-inv-004', 'INV-2026-004', 'seed-cust-004', 'seed-ord-004', 'SENT',    45000, 0,    18, 8100, 53100, 15000, 38100, true, NOW()-INTERVAL'20 days', NOW()),
  ('seed-inv-005', 'INV-2026-005', 'seed-cust-006', NULL,           'OVERDUE',  8000, 0,    18, 1440,  9440,     0,  9440, true, NOW()-INTERVAL'60 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ── 5 Follow-ups ─────────────────────────────────────────────
INSERT INTO "FollowUp" (id, "customerId", title, status, priority, "dueDate", "isActive", "createdAt", "updatedAt") VALUES
  ('seed-fu-001', 'seed-cust-002', 'Follow up on dress fitting',       'PENDING',     'NORMAL', NOW()+INTERVAL'2 days', true, NOW()-INTERVAL'5 days',  NOW()),
  ('seed-fu-002', 'seed-cust-006', 'Chase payment — overdue invoice',  'PENDING',     'HIGH',   NOW()-INTERVAL'5 days', true, NOW()-INTERVAL'10 days', NOW()),
  ('seed-fu-003', 'seed-cust-007', 'Confirm shirt fabric selection',   'IN_PROGRESS', 'NORMAL', NOW()+INTERVAL'1 day',  true, NOW()-INTERVAL'3 days',  NOW()),
  ('seed-fu-004', 'seed-cust-008', 'Send trial appointment reminder',  'PENDING',     'NORMAL', NOW()+INTERVAL'3 days', true, NOW()-INTERVAL'2 days',  NOW()),
  ('seed-fu-005', 'seed-cust-010', 'Upsell — Office Blazer set',       'PENDING',     'LOW',    NOW()+INTERVAL'7 days', true, NOW(),                   NOW())
ON CONFLICT (id) DO NOTHING;

-- ── 5 Leads ──────────────────────────────────────────────────
INSERT INTO "Lead" (id, name, phone, email, interest, stage, value, source, "isActive", "createdAt", "updatedAt") VALUES
  ('seed-lead-001', 'Suresh Iyengar', '9988776655', 'suresh@example.com',  'Wedding Sherwani', 'INTERESTED', 45000, 'Instagram', true, NOW()-INTERVAL'10 days', NOW()),
  ('seed-lead-002', 'Fatima Sheikh',  '9988776656', 'fatima@example.com',  'Bridal Lehenga',   'QUOTED',     85000, 'Referral',  true, NOW()-INTERVAL'7 days',  NOW()),
  ('seed-lead-003', 'Amit Trivedi',   '9988776657', NULL,                  'Corporate Suit',   'ENQUIRY',    30000, 'Walk-in',   true, NOW()-INTERVAL'5 days',  NOW()),
  ('seed-lead-004', 'Lakshmi Venkat', '9988776658', 'lakshmi@example.com', 'Saree Blouse',     'CLOSED_WON', 12000, 'Google',    true, NOW()-INTERVAL'20 days', NOW()),
  ('seed-lead-005', 'Dev Malhotra',   '9988776659', 'dev@example.com',     'Bespoke Suit Set', 'INTERESTED', 60000, 'Instagram', true, NOW()-INTERVAL'3 days',  NOW())
ON CONFLICT (id) DO NOTHING;

-- ── 5 Fabrics ────────────────────────────────────────────────
INSERT INTO "Fabric" (id, name, type, color, "stockQty", "reorderLevel", supplier, "pricePerUnit", unit, "isActive", "createdAt", "updatedAt") VALUES
  ('seed-fab-001', 'Italian Wool — Charcoal', 'Wool',     'Charcoal', 12, 5, 'Milano Textiles', 2500, 'm', true, NOW()-INTERVAL'60 days', NOW()),
  ('seed-fab-002', 'Navy Blue Linen',          'Linen',    'Navy Blue',18, 5, 'Kerala Weavers',  1200, 'm', true, NOW()-INTERVAL'55 days', NOW()),
  ('seed-fab-003', 'Raw Silk — Ivory',         'Silk',     'Ivory',     3, 8, 'Banaras Silk Co', 3800, 'm', true, NOW()-INTERVAL'45 days', NOW()),
  ('seed-fab-004', 'Egyptian Cotton — White',  'Cotton',   'White',    25,10, 'Cairo Exports',    800, 'm', true, NOW()-INTERVAL'40 days', NOW()),
  ('seed-fab-005', 'Cashmere Blend — Caramel', 'Cashmere', 'Caramel',   2, 5, 'Kashmir Looms',  5500, 'm', true, NOW()-INTERVAL'30 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ── 12 POS Products ──────────────────────────────────────────
INSERT INTO "Product" (id, name, price, category, "isActive", "createdAt", "updatedAt") VALUES
  ('seed-prod-001', 'Suit (Bespoke)',      25000, 'Suits',    true, NOW(), NOW()),
  ('seed-prod-002', 'Blazer',             12000, 'Suits',    true, NOW(), NOW()),
  ('seed-prod-003', 'Sherwani (Bespoke)', 30000, 'Ethnic',   true, NOW(), NOW()),
  ('seed-prod-004', 'Kurta Pajama',        5000, 'Ethnic',   true, NOW(), NOW()),
  ('seed-prod-005', 'Nehru Jacket',        8000, 'Ethnic',   true, NOW(), NOW()),
  ('seed-prod-006', 'Dress Shirt',         3500, 'Shirts',   true, NOW(), NOW()),
  ('seed-prod-007', 'Formal Trousers',     4500, 'Trousers', true, NOW(), NOW()),
  ('seed-prod-008', 'Waistcoat',           6000, 'Suits',    true, NOW(), NOW()),
  ('seed-prod-009', 'Alteration',           500, 'Services', true, NOW(), NOW()),
  ('seed-prod-010', 'Dry Cleaning',         800, 'Services', true, NOW(), NOW()),
  ('seed-prod-011', 'Fabric (per metre)',  1200, 'Fabric',   true, NOW(), NOW()),
  ('seed-prod-012', 'Monogram Embroidery', 1500, 'Services', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
