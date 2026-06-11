-- Add methodNote for custom "Others" payment method description
ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "methodNote" TEXT;

-- Add PAYMENT_LINK to PaymentMethod enum if it exists as an enum type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod'
  ) THEN
    ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'PAYMENT_LINK';
  END IF;
END $$;
