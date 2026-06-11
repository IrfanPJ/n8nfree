-- Add fabric image URL to order items; keep fabricPrice column for backward compat (hidden in UI)
ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "fabricImageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "fabricColor"    TEXT;
