-- Expand Measurement table to match physical measurement form

ALTER TABLE "Measurement"
  -- Upper body additions
  ADD COLUMN IF NOT EXISTS "bicep"                 DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "lowerChest"            DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "stomach"               DOUBLE PRECISION,
  -- Jacket sub-section
  ADD COLUMN IF NOT EXISTS "jacketSleeve"          DOUBLE PRECISION,
  -- Waistcoat sub-section
  ADD COLUMN IF NOT EXISTS "waistcoatHalfShoulder" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "waistcoatLength"       DOUBLE PRECISION,
  -- Long Coat sub-section
  ADD COLUMN IF NOT EXISTS "longCoatSleeve"        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longCoatLength"        DOUBLE PRECISION,
  -- Trouser additions
  ADD COLUMN IF NOT EXISTS "kneeLength"            DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "kneeLose"              DOUBLE PRECISION,
  -- Skirt
  ADD COLUMN IF NOT EXISTS "skirtLength"           DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "skirtBottomHem"        DOUBLE PRECISION,
  -- Meta / header fields
  ADD COLUMN IF NOT EXISTS "department"            TEXT,
  ADD COLUMN IF NOT EXISTS "trialDate"             TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryDate"          TEXT,
  -- Remarks
  ADD COLUMN IF NOT EXISTS "upperRemarks"          TEXT,
  ADD COLUMN IF NOT EXISTS "lowerRemarks"          TEXT,
  ADD COLUMN IF NOT EXISTS "fabricNotes"           TEXT;
