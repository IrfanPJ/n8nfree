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
    branch: "Business Bay",
    branches: ["Business Bay"],
    createdAt: now,
    updatedAt: now,
  });

  if (error) {
    console.error("Signup error:", error);
    return { success: false, error: "Failed to create account" };
  }

  return { success: true };
}

const addTeamMemberSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]),
  position: z.string().nullable(),
});

export async function addTeamMemberAction(
  data: unknown
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = addTeamMemberSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const { name, email, password, role, position } = parsed.data;

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
    branch: "Business Bay",
    branches: ["Business Bay"],
    createdAt: now,
    updatedAt: now,
  });

  if (error) {
    console.error("Add team member error:", error);
    return { success: false, error: "Failed to create account" };
  }

  return { success: true };
}
