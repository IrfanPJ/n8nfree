import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";
import { supabase as serviceRoleClient } from "./supabase";

function getJwtSecret(): Uint8Array {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error(
      "SUPABASE_JWT_SECRET is not set. Get it from Supabase Dashboard -> Project Settings -> API -> JWT Settings -> JWT Secret, and add it to .env.local (and your Vercel project's env vars)."
    );
  }
  return new TextEncoder().encode(secret);
}

type ScopedSession = {
  user: { id: string; role: string; branches?: string[] | null };
};

// Per-process token cache, keyed by "branches:role", valid for 55 of the
// token's 60 minute lifetime so a request never gets caught using one
// that's about to expire mid-query.
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

// Deactivating a branch (Settings -> Branches) should actually revoke
// access to it, not just hide it cosmetically — filter a user's branches
// down to currently-active ones before they ever reach the JWT. Cached
// briefly per-process since this runs on every scoped-client request.
let activeBranchIdsCache: { ids: Set<string>; expiresAt: number } | null = null;

async function getActiveBranchIds(): Promise<Set<string>> {
  if (activeBranchIdsCache && activeBranchIdsCache.expiresAt > Date.now()) {
    return activeBranchIdsCache.ids;
  }
  const { data } = await serviceRoleClient.from("Branch").select("id").eq("isActive", true);
  const ids = new Set((data ?? []).map((b: { id: string }) => b.id));
  activeBranchIdsCache = { ids, expiresAt: Date.now() + 60_000 };
  return ids;
}

async function getBranchToken(branches: string[], userRole: string): Promise<string> {
  const key = `${branches.join(",")}:${userRole}`;
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const token = await new SignJWT({
    role: "authenticated",
    user_role: userRole,
    branch_ids: branches,
    iss: "supabase",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(getJwtSecret());

  tokenCache.set(key, { token, expiresAt: Date.now() + 55 * 60 * 1000 });
  return token;
}

/**
 * Returns a Supabase client scoped to the caller's branch access.
 * - SUPER_ADMIN -> the service-role client (legitimately sees every branch)
 * - everyone else -> an anon-key client carrying a signed JWT with their
 *   branch_ids; Postgres RLS policies (see supabase/migrations/20260624_*_branch_rls.sql)
 *   enforce the actual isolation, not this function.
 */
export async function getScopedClient(session: ScopedSession): Promise<SupabaseClient> {
  if (session.user.role === "SUPER_ADMIN") {
    return serviceRoleClient;
  }

  const activeIds = await getActiveBranchIds();
  const branches = (session.user.branches ?? []).filter((id) => activeIds.has(id));
  const token = await getBranchToken(branches, session.user.role);

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );
}
