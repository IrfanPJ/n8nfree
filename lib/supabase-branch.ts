import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";

const jwtSecret = new TextEncoder().encode(
  process.env.SUPABASE_JWT_SECRET ?? ""
);

// Per-process token cache — keyed by "branch:role", valid for 55 min
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getBranchToken(branch: string, userRole: string): Promise<string> {
  const key = `${branch}:${userRole}`;
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const token = await new SignJWT({
    role: "authenticated",
    branch,
    user_role: userRole,
    iss: "supabase",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(jwtSecret);

  tokenCache.set(key, { token, expiresAt: Date.now() + 55 * 60 * 1000 });
  return token;
}

/**
 * Returns a Supabase client scoped to the given branch.
 * - ADMIN / MANAGER → returns the service-role client (bypasses RLS, sees all branches)
 * - Everyone else → returns a custom-JWT client; RLS enforces branch isolation
 */
export async function getDbClient(
  userRole: string,
  userBranch: string
): Promise<SupabaseClient> {
  if (["ADMIN", "MANAGER"].includes(userRole)) {
    // Dynamic import keeps the service-role client a singleton
    const { supabase } = await import("@/lib/supabase");
    return supabase;
  }

  const token = await getBranchToken(userBranch, userRole);
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );
}
