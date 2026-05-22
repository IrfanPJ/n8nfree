-- ── Staff Position Column ────────────────────────────────────────────────────
-- Run this in Supabase SQL Editor after the main migration.
-- Adds a position field to the User table for granular job-function tracking.
-- Role (ADMIN/MANAGER/STAFF) controls access; position is for job function.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "position" TEXT DEFAULT NULL;

-- Valid values: SALES_STAFF | PURCHASE_STAFF | PRODUCTION_IN_CHARGE |
--               MASTER | TAILOR | QUALITY_CHECK |
--               LOGISTICS_COORDINATOR | LEAD_MANAGEMENT_STAFF

-- Backfill: existing users with role TAILOR get the TAILOR position
UPDATE "User" SET "position" = 'TAILOR' WHERE "role" = 'TAILOR';

-- Normalize any old TAILOR roles to STAFF (role is now access-level only)
UPDATE "User" SET "role" = 'STAFF' WHERE "role" = 'TAILOR';
