"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { ACTIVE_BRANCH_COOKIE } from "@/lib/active-branch";
import type { ApiResponse, Branch } from "@/types";

// Branch metadata is global (not RLS-isolated) — visible to whoever is
// allowed to see it, scoped in app code rather than the database.
export async function getBranches(): Promise<Branch[]> {
  const session = await auth();
  if (!session?.user) return [];

  let q = supabase.from("Branch").select("*").order("name");
  if (session.user.role !== "SUPER_ADMIN") {
    const branches = session.user.branches ?? [];
    if (branches.length === 0) return [];
    q = q.in("id", branches);
  }

  const { data } = await q;
  return (data ?? []) as Branch[];
}

export async function createBranch(data: { name: string; code: string; address?: string }): Promise<ApiResponse<Branch>> {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" };
  }
  if (!data.name?.trim() || !data.code?.trim()) {
    return { success: false, error: "Name and code are required" };
  }

  const now = new Date().toISOString();
  const { data: branch, error } = await supabase
    .from("Branch")
    .insert({
      id: randomUUID(),
      name: data.name.trim(),
      code: data.code.trim(),
      address: data.address || null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: branch as Branch };
}

export async function updateBranch(
  id: string,
  data: { name?: string; code?: string; address?: string | null }
): Promise<ApiResponse<Branch>> {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const { data: branch, error } = await supabase
    .from("Branch")
    .update({ ...data, updatedAt: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: branch as Branch };
}

export async function deactivateBranch(id: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" };
  }
  if (id === "business-bay") {
    return { success: false, error: "Cannot deactivate the default branch" };
  }

  const { error } = await supabase
    .from("Branch")
    .update({ isActive: false, updatedAt: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function activateBranch(id: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("Branch")
    .update({ isActive: true, updatedAt: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Tables with their own branchId, checked before a permanent delete so we
// never silently orphan real business data (orders, customers, invoices...).
const BRANCH_OWNED_TABLES = [
  "Order", "Customer", "Appointment", "Invoice", "Lead", "Fabric",
  "Purchase", "POSSale", "FollowUp", "Measurement", "Supplier",
  "TailorMaster", "Salesperson",
] as const;

export async function permanentlyDeleteBranch(id: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" };
  }
  if (id === "business-bay") {
    return { success: false, error: "Cannot delete the default branch" };
  }

  const counts = await Promise.all(
    BRANCH_OWNED_TABLES.map(async (table) => {
      const { count } = await supabase.from(table).select("*", { count: "exact", head: true }).eq("branchId", id);
      return { table, count: count ?? 0 };
    })
  );
  const withData = counts.filter((c) => c.count > 0);
  if (withData.length > 0) {
    return {
      success: false,
      error: `Cannot permanently delete — this branch still has data: ${withData.map((c) => `${c.count} ${c.table}`).join(", ")}. Deactivate it instead, or remove that data first.`,
    };
  }

  // Drop the branch id from anyone still assigned to it before deleting,
  // since User.branches is a plain array with no FK to enforce this.
  const { data: assignedUsers } = await supabase.from("User").select("id, branches").contains("branches", [id]);
  for (const u of assignedUsers ?? []) {
    const remaining = (u.branches ?? []).filter((b: string) => b !== id);
    await supabase.from("User").update({ branches: remaining }).eq("id", u.id);
  }

  const { error } = await supabase.from("Branch").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Sets the active-branch cookie used by every server action to resolve
 * which branch a read/write should be scoped to. Validated against the
 * caller's actual access — a non-SUPER_ADMIN can't switch to a branch
 * they're not assigned to.
 */
export async function setActiveBranch(branchId: string | null): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const store = await cookies();

  if (branchId === null) {
    if (session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Only SUPER_ADMIN can view all branches at once" };
    }
    store.delete(ACTIVE_BRANCH_COOKIE);
    // Every page under the dashboard reads branch-scoped data — a plain
    // router.refresh() only clears the *current* route's client cache, so
    // any other page visited earlier in this session would still serve
    // stale, pre-switch data until a hard reload. This purges all of it.
    revalidatePath("/", "layout");
    return { success: true };
  }

  if (session.user.role !== "SUPER_ADMIN" && !(session.user.branches ?? []).includes(branchId)) {
    return { success: false, error: "You don't have access to that branch" };
  }

  store.set(ACTIVE_BRANCH_COOKIE, branchId, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
  return { success: true };
}
