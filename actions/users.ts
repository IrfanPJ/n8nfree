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
  const { data, error } = await supabase
    .from("User")
    .select("id, name, email, role, position, isActive, createdAt")
    .order("createdAt", { ascending: true });
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data ?? [] };
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
