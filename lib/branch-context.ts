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
 * Resolves which branchId a SUPER_ADMIN's read should be narrowed to, if any.
 * Returns undefined for non-SUPER_ADMIN callers (RLS already scopes their
 * reads at the database level) and for a SUPER_ADMIN viewing "All Branches".
 */
export function resolveReadBranchFilter(session: BranchSession, requestedBranchId?: string | null): string | undefined {
  if (session.user.role !== "SUPER_ADMIN") return undefined;
  return requestedBranchId ?? undefined;
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
