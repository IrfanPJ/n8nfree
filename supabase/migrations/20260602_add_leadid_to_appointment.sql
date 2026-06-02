ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "leadId" TEXT REFERENCES "Lead"(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_appointment_lead ON "Appointment"("leadId");
