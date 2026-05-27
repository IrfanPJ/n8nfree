-- Add per-user page-level permissions to User table
-- NULL = no restrictions (full access); TEXT[] = list of allowed page keys
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pagePermissions" TEXT[] DEFAULT NULL;
