-- Migrate all data to Business Bay (single branch)
UPDATE "Order"       SET branch = 'Business Bay';
UPDATE "Customer"    SET branch = 'Business Bay';
UPDATE "Appointment" SET branch = 'Business Bay';
UPDATE "Invoice"     SET branch = 'Business Bay';
UPDATE "Lead"        SET branch = 'Business Bay';
UPDATE "Fabric"      SET branch = 'Business Bay';
UPDATE "Purchase"    SET branch = 'Business Bay';
UPDATE "POSSale"     SET branch = 'Business Bay';
UPDATE "FollowUp"    SET branch = 'Business Bay';
UPDATE "User"        SET branch = 'Business Bay', branches = '{Business Bay}';

-- Change defaults so new rows are always Business Bay
ALTER TABLE "Order"       ALTER COLUMN branch SET DEFAULT 'Business Bay';
ALTER TABLE "Customer"    ALTER COLUMN branch SET DEFAULT 'Business Bay';
ALTER TABLE "Appointment" ALTER COLUMN branch SET DEFAULT 'Business Bay';
ALTER TABLE "Invoice"     ALTER COLUMN branch SET DEFAULT 'Business Bay';
ALTER TABLE "Lead"        ALTER COLUMN branch SET DEFAULT 'Business Bay';
ALTER TABLE "Fabric"      ALTER COLUMN branch SET DEFAULT 'Business Bay';
ALTER TABLE "Purchase"    ALTER COLUMN branch SET DEFAULT 'Business Bay';
ALTER TABLE "POSSale"     ALTER COLUMN branch SET DEFAULT 'Business Bay';
ALTER TABLE "FollowUp"    ALTER COLUMN branch SET DEFAULT 'Business Bay';
ALTER TABLE "User"        ALTER COLUMN branch SET DEFAULT 'Business Bay';
ALTER TABLE "User"        ALTER COLUMN branches SET DEFAULT '{Business Bay}';
