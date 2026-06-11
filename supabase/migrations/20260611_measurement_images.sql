-- Add reference image URLs to Measurement records
ALTER TABLE "Measurement"
  ADD COLUMN IF NOT EXISTS "imageUrls" TEXT[] NOT NULL DEFAULT '{}';
