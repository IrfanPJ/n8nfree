-- Multi-branch retrofit, step 3: User.branches currently holds free-text
-- branch names ('Business Bay', or the older 'Main' default). From here on
-- it holds Branch.id values instead, so it can be compared directly against
-- session JWT branch_ids claims and Branch table rows.

UPDATE "User"
SET branches = ARRAY['business-bay']
WHERE branches IS NULL
   OR branches = '{}'
   OR 'Business Bay' = ANY(branches)
   OR 'Main' = ANY(branches);

ALTER TABLE "User" ALTER COLUMN branches SET DEFAULT ARRAY['business-bay'];
