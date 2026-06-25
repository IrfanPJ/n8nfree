-- Fixes "infinite recursion detected in policy for relation User" (42P17).
--
-- "admin_write_users" is a leftover policy from an earlier, unrelated RLS
-- attempt — it checks role by querying "User" from within a policy ON
-- "User", which is the classic Supabase self-referencing RLS recursion bug.
-- It applies to cmd ALL (covers SELECT too), so it fired on every query
-- touching the table, including embedded User joins inside Order/Appointment
-- selects. Its policy name never matched "user_write" in
-- supabase-rls-policies.sql, so the DROP POLICY IF EXISTS there never
-- touched it and both coexisted.
--
-- "auth_read_users" is redundant — already fully covered by "user_read" and
-- "branch_user_select" — dropped for cleanliness.

DROP POLICY IF EXISTS "admin_write_users" ON "User";
DROP POLICY IF EXISTS "auth_read_users" ON "User";
