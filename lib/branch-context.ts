type BranchSession = {
  user: { role: string; branches?: string[] | null };
};

/**
 * Resolves which branchId a write should be attributed to.
 * - SUPER_ADMIN must explicitly pick a branch (they have no default branch
 *   of their own) — throws if none was supplied.
 * - Everyone else is locked to their assigned branches: an explicitly
 *   requested branch is honored only if they actually belong to it,
 *   otherwise their first assigned branch is used.
 */
export function resolveActiveBranchId(session: BranchSession, requestedBranchId?: string | null): string {
  const branches = session.user.branches ?? [];

  if (session.user.role === "SUPER_ADMIN") {
    if (!requestedBranchId) {
      throw new Error("SUPER_ADMIN must select a branch before creating branch-scoped records");
    }
    return requestedBranchId;
  }

  if (requestedBranchId && branches.includes(requestedBranchId)) {
    return requestedBranchId;
  }

  if (branches.length === 0) {
    throw new Error("User has no assigned branch");
  }

  return branches[0];
}

/**
 * Resolves which branchId a read should be narrowed to, if any.
 * - SUPER_ADMIN: whatever they've picked in the switcher, or undefined for
 *   "All Branches".
 * - Single-branch users: undefined — RLS already restricts them to their
 *   one branch, no extra filter needed.
 * - Multi-branch ADMIN/MANAGER/STAFF: RLS allows rows from ANY of their
 *   assigned branches (their JWT carries all of them), so without this,
 *   switching the topbar selector would do nothing — every list would show
 *   all of their branches mixed together. Narrow to whichever branch is
 *   currently active, defaulting to their first branch if none picked yet.
 */
export function resolveReadBranchFilter(session: BranchSession, requestedBranchId?: string | null): string | undefined {
  if (session.user.role === "SUPER_ADMIN") return requestedBranchId ?? undefined;

  const branches = session.user.branches ?? [];
  if (branches.length <= 1) return undefined;

  if (requestedBranchId && branches.includes(requestedBranchId)) return requestedBranchId;
  return branches[0];
}

/**
 * Used for team-management actions that read/write via the service-role
 * client (bypasses RLS), so the branch boundary has to be enforced in app
 * code instead: a branch-scoped ADMIN may only act on team members who
 * share at least one of their own branches. SUPER_ADMIN always passes.
 */
export function sharesBranch(session: BranchSession, targetBranches: string[] | null | undefined): boolean {
  if (session.user.role === "SUPER_ADMIN") return true;
  const own = session.user.branches ?? [];
  return (targetBranches ?? []).some((b) => own.includes(b));
}
