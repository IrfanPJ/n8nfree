-- Production Dashboard module: tailoring workshop schedule tracking.
-- Independent of Order/Customer/TailorMaster (those model client-facing CRM
-- orders and a bare assignment lookup; this models the physical workshop's
-- own roster, price list, and production schedule, seeded from the
-- "SHJ Production Schedules" spreadsheet). No branchId / branch RLS — the
-- workshop dataset isn't scoped per branch, access is gated at the app layer
-- via PAGE_PERMISSIONS like every other module.

CREATE TABLE IF NOT EXISTS "ProductionTailor" (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  -- Sheet's "Sl No." — used as the idempotent-upsert key on import. Two
  -- source rows can share the same Name (e.g. two different people both
  -- named "Aslam" in the real data) so name alone isn't a safe key.
  "sourceRowId"         INTEGER UNIQUE,
  name                  TEXT NOT NULL,
  "jobTitles"           TEXT[] NOT NULL DEFAULT '{}',
  "capacityRaw"         TEXT,
  "capacityPcsPerDay"   NUMERIC(6, 2),
  "totalWorkingHours"   NUMERIC(5, 2) NOT NULL DEFAULT 8,
  "weeklyOffDay"        TEXT,
  "monthlySalary"       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  "otherAllowance"      NUMERIC(10, 2) NOT NULL DEFAULT 0,
  "visaExpense"         NUMERIC(10, 2) NOT NULL DEFAULT 0,
  "totalCostToCompany"  NUMERIC(10, 2) GENERATED ALWAYS AS
                          ("monthlySalary" + "otherAllowance" + "visaExpense") STORED,
  "isActive"            BOOLEAN NOT NULL DEFAULT true,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "ProductionTailor" DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "ProductionPriceListItem" (
  id                        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "sourceRowId"             INTEGER,
  item                      TEXT NOT NULL UNIQUE,
  "unitPrice"               NUMERIC(10, 2) NOT NULL DEFAULT 0,
  -- Manually-entered fallback lookup; NULL means "not supplied yet" — Hours
  -- Needed then derives from the assigned tailor's capacity text instead.
  "estimatedHoursPerPiece"  NUMERIC(6, 2),
  "createdAt"               TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"               TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "ProductionPriceListItem" DISABLE ROW LEVEL SECURITY;

-- Manual overrides for orders.Item strings that don't match a price list
-- item automatically. Keyed by the raw item text so fixing one mapping
-- applies to every order (past and future) sharing that text.
CREATE TABLE IF NOT EXISTS "ProductionItemAlias" (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "rawItem"           TEXT NOT NULL UNIQUE,
  "priceListItemId"   TEXT NOT NULL REFERENCES "ProductionPriceListItem"(id) ON DELETE CASCADE,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "ProductionItemAlias" DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "ProductionOrder" (
  id                       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  -- Sheet's own "Sl No." column. Used as the idempotent-upsert key on
  -- import: (Invoice, Item) was tried first but collides on real data
  -- (multiple distinct line items can share both), which would silently
  -- merge separate orders on re-upload.
  "sourceRowId"            INTEGER UNIQUE,
  "receivedDate"           DATE NOT NULL,
  store                    TEXT NOT NULL CHECK (store IN ('SHJ', 'DXB', 'AUH', 'KSA')),
  "invoiceNo"               TEXT NOT NULL,
  notes                    TEXT,
  "itemRaw"                TEXT NOT NULL,
  "priceListItemId"        TEXT REFERENCES "ProductionPriceListItem"(id) ON DELETE SET NULL,
  qty                      INTEGER NOT NULL DEFAULT 1,
  "tailorId"               TEXT REFERENCES "ProductionTailor"(id) ON DELETE SET NULL,
  "tailorNameRaw"          TEXT,
  "deliveryDate"           DATE,
  "dispatchTime"           TIME,
  "scheduledDispatchDate"  DATE,
  "suggestedDispatchDate"  TIMESTAMPTZ,
  "possibleTime"           TIME,
  -- 12 values from spec + CUTTING NOT RECEIVED, a real recurring status
  -- found in the source data but absent from the original spec list.
  status                   TEXT NOT NULL CHECK (status IN (
                              'IN PRODUCTION', 'NEXT IN LINE', 'READY FOR DELIVERY',
                              'READY FOR DISPATCH', 'DISPATCHED', 'DELIVERED',
                              'TRIAL READY', 'TRIAL COMPLETED', 'RETURN ITEMS',
                              'ON HOLD', 'PENDING', 'CANCELLED', 'CUTTING NOT RECEIVED'
                            )),
  remarks                  TEXT,
  "isActive"               BOOLEAN NOT NULL DEFAULT true,
  "createdAt"              TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "ProductionOrder" DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS "idx_ProductionOrder_status"          ON "ProductionOrder"(status);
CREATE INDEX IF NOT EXISTS "idx_ProductionOrder_store"           ON "ProductionOrder"(store);
CREATE INDEX IF NOT EXISTS "idx_ProductionOrder_tailorId"        ON "ProductionOrder"("tailorId");
CREATE INDEX IF NOT EXISTS "idx_ProductionOrder_deliveryDate"    ON "ProductionOrder"("deliveryDate");
CREATE INDEX IF NOT EXISTS "idx_ProductionOrder_invoiceNo"       ON "ProductionOrder"("invoiceNo");
CREATE INDEX IF NOT EXISTS "idx_ProductionOrder_priceListItemId" ON "ProductionOrder"("priceListItemId");
