-- Multi-branch retrofit, step 5 (missed in the original pass): "role" on
-- "User" is a native Postgres enum ("UserRole"), not plain text — ADMIN,
-- MANAGER, STAFF were already values on it. Add SUPER_ADMIN so it can be
-- assigned. Must run as its own statement before any UPDATE that uses it.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
