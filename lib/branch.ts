/**
 * Returns the branch to filter by for a given session user.
 * - ADMIN / MANAGER: can see any branch; pass requestedBranch from URL param
 *   (undefined or "All Branches" means no filter → see everything)
 * - Everyone else: always locked to their own branch regardless of URL params
 */
export function getBranchFilter(
  user: { role: string; branch: string },
  requestedBranch?: string
): string | null {
  const isAdmin = ["ADMIN", "MANAGER"].includes(user.role);

  if (isAdmin) {
    if (!requestedBranch || requestedBranch === "All Branches") return null;
    return requestedBranch;
  }

  // Non-admins are always locked to their own branch
  return user.branch ?? "Main";
}
