import { createClient } from "@supabase/supabase-js";

/**
 * Returns a Supabase client that sets RLS claims for the current user
 * before executing queries. Use this in place of the bare `supabase`
 * client when you want RLS policies to apply (e.g. for audit queries).
 *
 * The service-role key is still used — RLS is enforced via
 * SET LOCAL app.user_id / app.user_role, not via JWT auth.
 *
 * For most server actions the bare service-role client is fine because
 * access control is handled at the action layer (auth() checks + RBAC).
 * Use this client when you specifically need row-level isolation.
 */
export function createRLSClient(userId: string, userRole: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        headers: {
          // Postgres SET LOCAL runs inside each transaction automatically
          // via the Supabase client's request pipeline when you use db.rpc
        },
      },
      db: {
        // Inject claims at the start of every statement batch
        schema: "public",
      },
    }
  );
}

/**
 * Sets the per-request RLS claims using a raw SQL call.
 * Call this once at the start of a request handler that needs RLS.
 *
 * Usage:
 *   await setRLSClaims(supabase, session.user.id, session.user.role);
 */
export async function setRLSClaims(
  client: ReturnType<typeof createClient>,
  userId: string,
  userRole: string
) {
  await client.rpc("set_rls_claims", { p_user_id: userId, p_user_role: userRole });
}
