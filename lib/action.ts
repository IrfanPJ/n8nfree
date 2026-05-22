"use server";

import { auth } from "@/lib/auth";
import type { ApiResponse, UserRole } from "@/types";

type ActionFn<TArgs extends unknown[], TReturn> = (
  session: { user: { id: string; role: string; email?: string | null; name?: string | null } },
  ...args: TArgs
) => Promise<ApiResponse<TReturn>>;

/**
 * Wraps a server action with auth + optional role guard.
 * Usage:
 *   export const deleteCustomer = withAuth(
 *     async (session, id: string) => { ... },
 *     { roles: ["ADMIN", "MANAGER"] }
 *   );
 */
export function withAuth<TArgs extends unknown[], TReturn>(
  fn: ActionFn<TArgs, TReturn>,
  options: { roles?: UserRole[] } = {}
) {
  return async (...args: TArgs): Promise<ApiResponse<TReturn>> => {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (options.roles && options.roles.length > 0) {
      if (!options.roles.includes(session.user.role as UserRole)) {
        return { success: false, error: "Insufficient permissions" };
      }
    }

    return fn(session as { user: { id: string; role: string; email?: string | null; name?: string | null } }, ...args);
  };
}
