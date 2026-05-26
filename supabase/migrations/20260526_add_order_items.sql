-- Add OrderItem table for multi-garment orders with per-item tailor assignment
CREATE TABLE IF NOT EXISTS "OrderItem" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "orderId" TEXT NOT NULL REFERENCES "Order"(id) ON DELETE CASCADE,
  "garmentType" TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "assignedToId" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  notes TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "OrderItem_assignedToId_idx" ON "OrderItem"("assignedToId");

-- Match RLS setting of the Order table (disabled)
ALTER TABLE "OrderItem" DISABLE ROW LEVEL SECURITY;
