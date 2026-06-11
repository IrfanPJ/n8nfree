-- Salesperson field on Order now references CRM User, not the Salesperson master table

-- Clear any stale salespersonId values that reference the old Salesperson table
-- (IDs not present in User will violate the new FK)
UPDATE "Order"
SET "salespersonId" = NULL
WHERE "salespersonId" IS NOT NULL
  AND "salespersonId" NOT IN (SELECT id FROM "User");

ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_salespersonId_fkey";

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_salespersonId_fkey"
    FOREIGN KEY ("salespersonId") REFERENCES "User"(id) ON DELETE SET NULL;
