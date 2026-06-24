import { cookies } from "next/headers";

export const ACTIVE_BRANCH_COOKIE = "activeBranchId";

export async function getActiveBranchCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACTIVE_BRANCH_COOKIE)?.value || undefined;
}
