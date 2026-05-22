-- ============================================================
-- House of Tailors — Supabase SQL Migrations
-- Run these in your Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ── Lead table ───────────────────────────────────────────────
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

-- Enable Row Level Security
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
DROP POLICY IF EXISTS "auth_all_lead" ON "Lead";
CREATE POLICY "auth_all_lead" ON "Lead"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Fabric table ─────────────────────────────────────────────
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

-- Enable Row Level Security
ALTER TABLE "Fabric" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
DROP POLICY IF EXISTS "auth_all_fabric" ON "Fabric";
CREATE POLICY "auth_all_fabric" ON "Fabric"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Optional: seed default Fabric types (run after table creation)
-- INSERT INTO "Fabric" (id, name, type, color, "stockQty", "reorderLevel", "pricePerUnit", unit)
-- VALUES
--   (gen_random_uuid()::text, 'Italian Wool — Charcoal', 'Wool', 'Charcoal', 15, 5, 2500, 'm'),
--   (gen_random_uuid()::text, 'Navy Blue Linen', 'Linen', 'Navy Blue', 20, 5, 1200, 'm');

-- ── Product table (POS products managed in DB) ───────────────
CREATE TABLE IF NOT EXISTS "Product" (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  price       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  category    TEXT NOT NULL,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all_product" ON "Product";
CREATE POLICY "auth_all_product" ON "Product"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── POSSale table ─────────────────────────────────────────────
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

-- Enable Row Level Security
ALTER TABLE "POSSale" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
DROP POLICY IF EXISTS "auth_all_possale" ON "POSSale";
CREATE POLICY "auth_all_possale" ON "POSSale"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- PERFORMANCE INDEXES
-- Run these after all tables have been created.
-- ============================================================

-- Order indexes
CREATE INDEX IF NOT EXISTS idx_order_status       ON "Order"(status);
CREATE INDEX IF NOT EXISTS idx_order_customer     ON "Order"("customerId");
CREATE INDEX IF NOT EXISTS idx_order_delivery     ON "Order"("deliveryDate");
CREATE INDEX IF NOT EXISTS idx_order_priority     ON "Order"(priority);
CREATE INDEX IF NOT EXISTS idx_order_active       ON "Order"("isActive");
CREATE INDEX IF NOT EXISTS idx_order_created      ON "Order"("createdAt" DESC);

-- Customer indexes
CREATE INDEX IF NOT EXISTS idx_customer_name      ON "Customer"(name);
CREATE INDEX IF NOT EXISTS idx_customer_phone     ON "Customer"(phone);
CREATE INDEX IF NOT EXISTS idx_customer_email     ON "Customer"(email);
CREATE INDEX IF NOT EXISTS idx_customer_active    ON "Customer"("isActive");
CREATE INDEX IF NOT EXISTS idx_customer_vip       ON "Customer"("isVIP");

-- Appointment indexes
CREATE INDEX IF NOT EXISTS idx_appt_start         ON "Appointment"("startTime");
CREATE INDEX IF NOT EXISTS idx_appt_customer      ON "Appointment"("customerId");
CREATE INDEX IF NOT EXISTS idx_appt_status        ON "Appointment"(status);
CREATE INDEX IF NOT EXISTS idx_appt_staff         ON "Appointment"("staffId");

-- Invoice indexes
CREATE INDEX IF NOT EXISTS idx_invoice_customer   ON "Invoice"("customerId");
CREATE INDEX IF NOT EXISTS idx_invoice_status     ON "Invoice"(status);
CREATE INDEX IF NOT EXISTS idx_invoice_due        ON "Invoice"("dueDate");
CREATE INDEX IF NOT EXISTS idx_invoice_order      ON "Invoice"("orderId");

-- Lead indexes
CREATE INDEX IF NOT EXISTS idx_lead_stage         ON "Lead"(stage);
CREATE INDEX IF NOT EXISTS idx_lead_active        ON "Lead"("isActive");

-- Fabric indexes
CREATE INDEX IF NOT EXISTS idx_fabric_name        ON "Fabric"(name);
CREATE INDEX IF NOT EXISTS idx_fabric_active      ON "Fabric"("isActive");

-- Activity log indexes (high write volume — only index what you query)
CREATE INDEX IF NOT EXISTS idx_actlog_user        ON "ActivityLog"("userId");
CREATE INDEX IF NOT EXISTS idx_actlog_customer    ON "ActivityLog"("customerId");
CREATE INDEX IF NOT EXISTS idx_actlog_created     ON "ActivityLog"("createdAt" DESC);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notif_user         ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS idx_notif_read         ON "Notification"("isRead");

-- Order history index
CREATE INDEX IF NOT EXISTS idx_orderhist_order    ON "OrderHistory"("orderId");

-- Measurement index
CREATE INDEX IF NOT EXISTS idx_measurement_cust   ON "Measurement"("customerId");

-- Follow-up indexes
CREATE INDEX IF NOT EXISTS idx_followup_customer  ON "FollowUp"("customerId");
CREATE INDEX IF NOT EXISTS idx_followup_status    ON "FollowUp"(status);
CREATE INDEX IF NOT EXISTS idx_followup_due       ON "FollowUp"("dueDate");

-- Purchase index
CREATE INDEX IF NOT EXISTS idx_purchase_date      ON "Purchase"("purchaseDate" DESC);

-- Payment index
CREATE INDEX IF NOT EXISTS idx_payment_invoice    ON "Payment"("invoiceId");
