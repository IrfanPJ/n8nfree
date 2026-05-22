import { createClient } from "@supabase/supabase-js";

export function createRLSClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Sets per-request RLS claims so Postgres policies can read
 * current_user_id() / current_user_role() during the session.
 *
 * Usage in a server action:
 *   const rls = createRLSClient();
 *   await setRLSClaims(rls, session.user.id, session.user.role);
 *   const { data } = await rls.from("Notification").select("*");
 */
export async function setRLSClaims(
  client: ReturnType<typeof createRLSClient>,
  userId: string,
  userRole: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client.rpc as any)("set_rls_claims", { p_user_id: userId, p_user_role: userRole });
}
