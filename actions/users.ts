"use server";

import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { sharesBranch } from "@/lib/branch-context";
import bcrypt from "bcryptjs";
import type { StaffPosition, UserRole } from "@/types";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

export async function getAssignableStaff() {
  const session = await auth();
  if (!session?.user) return { success: false as const, error: "Unauthorized" };

  let q = supabase
    .from("User")
    .select("id, name, role, position, isActive, branches")
    .eq("isActive", true)
    .order("name");

  if (session.user.role !== "SUPER_ADMIN") {
    q = q.overlaps("branches", session.user.branches ?? []);
  }

  const { data, error } = await q;
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: (data ?? []) as { id: string; name: string; role: string; position: string | null; isActive: boolean }[] };
}

export async function getTeamMembers() {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return { success: false as const, error: "Unauthorized" };
  }

  let q = supabase
    .from("User")
    .select("id, name, email, role, position, isActive, createdAt, pagePermissions, branches")
    .eq("isActive", true)
    .order("createdAt", { ascending: true });

  if (session.user.role !== "SUPER_ADMIN") {
    q = q.overlaps("branches", session.user.branches ?? []);
  }

  const { data, error } = await q;
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: (data ?? []) as any[] };
}

async function getTargetUser(userId: string): Promise<{ role: string | null; branches: string[] | null }> {
  const { data } = await supabase.from("User").select("role, branches").eq("id", userId).maybeSingle();
  return { role: data?.role ?? null, branches: data?.branches ?? null };
}

// A branch-scoped ADMIN must never be able to act on a SUPER_ADMIN account —
// regardless of branch overlap. (Promoting someone to SUPER_ADMIN via direct
// SQL only changes `role`; their old `branches` array is often left behind,
// which would otherwise let a branch admin slip through the overlap check.)
function canActOnTarget(session: { user: { role: string } }, targetRole: string | null): boolean {
  if (targetRole === "SUPER_ADMIN") return session.user.role === "SUPER_ADMIN";
  return true;
}

export async function updateUserPermissions(
  userId: string,
  pagePermissions: string[] | null
) {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (userId === session.user.id) {
    return { success: false as const, error: "Cannot change your own permissions" };
  }
  const target = await getTargetUser(userId);
  if (!canActOnTarget(session, target.role) || !sharesBranch(session, target.branches)) {
    return { success: false as const, error: "Unauthorized" };
  }
  const { error } = await supabase
    .from("User")
    .update({ pagePermissions, updatedAt: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

// Branch (re-)assignment can grant access to a branch the acting ADMIN
// doesn't manage — restricted to SUPER_ADMIN to avoid that escalation path.
export async function updateUserBranches(userId: string, branches: string[]) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return { success: false as const, error: "Unauthorized" };
  }
  if (userId === session.user.id) {
    return { success: false as const, error: "Cannot change your own branch assignment" };
  }
  if (branches.length === 0) {
    return { success: false as const, error: "At least one branch must be assigned" };
  }
  const { error } = await supabase
    .from("User")
    .update({ branches, updatedAt: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

export async function deleteTeamMember(userId: string) {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (userId === session.user.id) {
    return { success: false as const, error: "You cannot delete your own account" };
  }
  const target = await getTargetUser(userId);
  if (!canActOnTarget(session, target.role) || !sharesBranch(session, target.branches)) {
    return { success: false as const, error: "Unauthorized" };
  }
  const { error } = await supabase
    .from("User")
    .update({ isActive: false, updatedAt: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

export async function resetMemberPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return { success: false, error: "Unauthorized" };
  }
  if (userId === session.user.id) {
    return { success: false, error: "Use Change Password to update your own password" };
  }
  const target = await getTargetUser(userId);
  if (!canActOnTarget(session, target.role) || !sharesBranch(session, target.branches)) {
    return { success: false, error: "Unauthorized" };
  }
  if (newPassword.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }
  const hashed = await bcrypt.hash(newPassword, 10);
  const { error } = await supabase
    .from("User")
    .update({ password: hashed, updatedAt: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateTeamMember(
  userId: string,
  updates: { position?: StaffPosition | null; role?: UserRole }
) {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (userId === session.user.id) {
    return { success: false as const, error: "You cannot change your own role or position" };
  }
  const target = await getTargetUser(userId);
  if (!canActOnTarget(session, target.role) || !sharesBranch(session, target.branches)) {
    return { success: false as const, error: "Unauthorized" };
  }
  // Only a SUPER_ADMIN can promote someone else to SUPER_ADMIN
  if (updates.role === "SUPER_ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return { success: false as const, error: "Only a Super Admin can assign that role" };
  }
  const { error } = await supabase
    .from("User")
    .update({ ...updates, updatedAt: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}
