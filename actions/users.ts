"use server";

import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { StaffPosition, UserRole } from "@/types";

export async function getAssignableStaff() {
  const session = await auth();
  if (!session?.user) return { success: false as const, error: "Unauthorized" };
  const { data, error } = await supabase
    .from("User")
    .select("id, name, role, position, isActive")
    .eq("isActive", true)
    .order("name");
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: (data ?? []) as { id: string; name: string; role: string; position: string | null; isActive: boolean }[] };
}

export async function getTeamMembers() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false as const, error: "Unauthorized" };
  }
  // Try with branches column first; fall back to without it if the migration hasn't run yet
  let { data, error } = await supabase
    .from("User")
    .select("id, name, email, role, position, isActive, createdAt, pagePermissions, branches")
    .eq("isActive", true)
    .order("createdAt", { ascending: true });
  if (error) {
    const fallback = await supabase
      .from("User")
      .select("id, name, email, role, position, isActive, createdAt, pagePermissions")
      .eq("isActive", true)
      .order("createdAt", { ascending: true });
    if (fallback.error) return { success: false as const, error: fallback.error.message };
    data = (fallback.data ?? []).map((u: any) => ({ ...u, branches: null })) as any;
  }
  return { success: true as const, data: (data ?? []) as any[] };
}

export async function updateUserPermissions(
  userId: string,
  pagePermissions: string[] | null
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false as const, error: "Unauthorized" };
  }
  if (userId === session.user.id) {
    return { success: false as const, error: "Cannot change your own permissions" };
  }
  const { error } = await supabase
    .from("User")
    .update({ pagePermissions, updatedAt: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

export async function updateUserBranches(userId: string, branches: string[]) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
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
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false as const, error: "Unauthorized" };
  }
  if (userId === session.user.id) {
    return { success: false as const, error: "You cannot delete your own account" };
  }
  const { error } = await supabase
    .from("User")
    .update({ isActive: false, updatedAt: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

export async function updateTeamMember(
  userId: string,
  updates: { position?: StaffPosition | null; role?: UserRole }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false as const, error: "Unauthorized" };
  }
  if (userId === session.user.id) {
    return { success: false as const, error: "You cannot change your own role or position" };
  }
  const { error } = await supabase
    .from("User")
    .update({ ...updates, updatedAt: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}
