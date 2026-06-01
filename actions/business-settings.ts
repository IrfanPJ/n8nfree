"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  name: z.string().max(100).default(""),
  gst: z.string().max(50).default(""),
  phone: z.string().max(30).default(""),
  email: z.string().email("Invalid email").or(z.literal("")).default(""),
  address: z.string().max(300).default(""),
});

export type BusinessSettings = z.infer<typeof schema>;

export async function getBusinessSettings(): Promise<BusinessSettings> {
  const { data } = await supabase
    .from("BusinessSettings")
    .select("name, gst, phone, email, address")
    .eq("id", "singleton")
    .maybeSingle();

  return {
    name: (data as any)?.name ?? "",
    gst: (data as any)?.gst ?? "",
    phone: (data as any)?.phone ?? "",
    email: (data as any)?.email ?? "",
    address: (data as any)?.address ?? "",
  };
}

export async function updateBusinessSettings(data: unknown) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false as const, error: "Unauthorized" };
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const { error } = await supabase
    .from("BusinessSettings")
    .upsert({
      id: "singleton",
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    });

  if (error) return { success: false as const, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/invoices");
  return { success: true as const };
}
