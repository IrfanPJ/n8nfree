-- !! RUN QUERY 1 FIRST, then RUN QUERY 2 separately !!
-- PostgreSQL requires enum values to be committed before they can be used.

-- === QUERY 1: Run this first, then wait for it to complete ===
ALTER TYPE "OrderPriority" ADD VALUE IF NOT EXISTS 'VIP';
ALTER TYPE "OrderPriority" ADD VALUE IF NOT EXISTS 'REGULAR';

-- === QUERY 2: Run this after Query 1 has committed ===
-- UPDATE "Order" SET priority = 'VIP'     WHERE priority = 'URGENT';
-- UPDATE "Order" SET priority = 'URGENT'  WHERE priority = 'HIGH';
-- UPDATE "Order" SET priority = 'REGULAR' WHERE priority IN ('LOW', 'NORMAL');
