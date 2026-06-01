-- Add multi-branch assignment to users
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS branches TEXT[] NOT NULL DEFAULT '{Main}';

-- Seed from the existing single-branch column so existing users keep their branch
UPDATE "User" SET branches = ARRAY[branch] WHERE branches = '{Main}' AND branch != 'Main';

CREATE INDEX IF NOT EXISTS idx_user_branches ON "User" USING gin(branches);
