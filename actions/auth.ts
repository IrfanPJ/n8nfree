"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";

const signUpSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function signUpAction(
  data: unknown
): Promise<{ success: boolean; error?: string }> {
  const parsed = signUpSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const { name, email, password } = parsed.data;

  const { data: existing } = await supabase
    .from("User")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) return { success: false, error: "An account with this email already exists" };

  const hashed = await bcrypt.hash(password, 10);

  const now = new Date().toISOString();
  const { error } = await supabase.from("User").insert({
    id: randomUUID(),
    name,
    email,
    password: hashed,
    role: "STAFF",
    position: null,
    isActive: true,
    branches: ["business-bay"],
    createdAt: now,
    updatedAt: now,
  });

  if (error) {
    console.error("Signup error:", error);
    return { success: false, error: "Failed to create account" };
  }

  return { success: true };
}

export async function changePasswordAction(
  data: unknown
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const parsed = z
    .object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: z.string().min(8, "New password must be at least 8 characters"),
    })
    .safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  const { currentPassword, newPassword } = parsed.data;

  const { data: user } = await supabase
    .from("User")
    .select("password")
    .eq("id", session.user.id)
    .single();

  if (!user) return { success: false, error: "User not found" };

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return { success: false, error: "Current password is incorrect" };

  const hashed = await bcrypt.hash(newPassword, 10);
  const { error } = await supabase
    .from("User")
    .update({ password: hashed, updatedAt: new Date().toISOString() })
    .eq("id", session.user.id);

  if (error) return { success: false, error: "Failed to update password" };
  return { success: true };
}

const addTeamMemberSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF"]),
  position: z.string().nullable(),
  branchIds: z.array(z.string()).default([]),
});

export async function addTeamMemberAction(
  data: unknown
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = addTeamMemberSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const { name, email, password, role, position, branchIds } = parsed.data;

  if (role === "SUPER_ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return { success: false, error: "Only a Super Admin can assign that role" };
  }

  const ownBranches = session.user.branches ?? [];
  if (session.user.role !== "SUPER_ADMIN") {
    const allowed = branchIds.length > 0 && branchIds.every((b) => ownBranches.includes(b));
    if (!allowed) {
      return { success: false, error: "You can only assign branches you yourself belong to" };
    }
  }
  if (role !== "SUPER_ADMIN" && branchIds.length === 0) {
    return { success: false, error: "At least one branch must be assigned" };
  }

  const { data: existing } = await supabase
    .from("User")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) return { success: false, error: "An account with this email already exists" };

  const hashed = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  const { error } = await supabase.from("User").insert({
    id: randomUUID(),
    name,
    email,
    password: hashed,
    role,
    position: position || null,
    isActive: true,
    branches: branchIds,
    createdAt: now,
    updatedAt: now,
  });

  if (error) {
    console.error("Add team member error:", error);
    return { success: false, error: "Failed to create account" };
  }

  return { success: true };
}
