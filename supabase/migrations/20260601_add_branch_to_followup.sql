ALTER TABLE "FollowUp" ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT 'Main';
CREATE INDEX IF NOT EXISTS idx_followup_branch ON "FollowUp"(branch);
