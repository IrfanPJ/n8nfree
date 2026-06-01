"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { z } from "zod";
import type { ApiResponse, PaginatedResult, PurchaseWithRelations, Supplier } from "@/types";

const purchaseSchema = z.object({
  supplierId: z.string().optional(),
  itemName: z.string().min(1, "Item name required"),
  itemCode: z.string().optional(),
  category: z.string().default("FABRIC"),
  quantity: z.number().positive("Quantity must be positive"),
  unit: z.string().default("meters"),
  unitPrice: z.number().nonnegative(),
  totalAmount: z.number().nonnegative(),
  paidAmount: z.number().nonnegative().default(0),
  notes: z.string().optional(),
  purchaseDate: z.string().optional(),
});

const supplierSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export async function getPurchases(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  supplierId?: string;
  branch?: string;
}): Promise<PaginatedResult<PurchaseWithRelations>> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { page = 1, pageSize = 20, search, category, supplierId } = params;
  const skip = (page - 1) * pageSize;

  let countQ = supabase.from("Purchase").select("*", { count: "exact", head: true });
  let dataQ = supabase.from("Purchase").select(`*, supplier:Supplier!supplierId(*)`);

  if (supplierId) { countQ = countQ.eq("supplierId", supplierId); dataQ = dataQ.eq("supplierId", supplierId); }
  if (category) { countQ = countQ.eq("category", category); dataQ = dataQ.eq("category", category); }
  if (search) {
    countQ = countQ.ilike("itemName", `%${search}%`);
    dataQ = dataQ.ilike("itemName", `%${search}%`);
  }

  const [{ count: total }, { data }] = await Promise.all([
    countQ,
    dataQ.order("purchaseDate", { ascending: false }).range(skip, skip + pageSize - 1),
  ]);

  return {
    data: (data ?? []) as PurchaseWithRelations[],
    total: total ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((total ?? 0) / pageSize),
  };
}

export async function createPurchase(data: unknown): Promise<ApiResponse<PurchaseWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = purchaseSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  try {
    const id = randomUUID();
    const now = new Date().toISOString();

    const { data: purchase, error } = await supabase
      .from("Purchase")
      .insert({
        id,
        ...parsed.data,
        supplierId: parsed.data.supplierId || null,
        purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate).toISOString() : now,
        createdAt: now,
        updatedAt: now,
      })
      .select(`*, supplier:Supplier!supplierId(*)`)
      .single();

    if (error) throw error;

    revalidatePath("/purchases");
    return { success: true, data: purchase as PurchaseWithRelations, message: "Purchase recorded" };
  } catch {
    return { success: false, error: "Failed to create purchase" };
  }
}

export async function getSuppliers(): Promise<Supplier[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { data } = await supabase.from("Supplier").select("*").eq("isActive", true).order("name", { ascending: true });
  return (data ?? []) as Supplier[];
}

export async function createSupplier(data: unknown): Promise<ApiResponse<Supplier>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = supplierSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  try {
    const id = randomUUID();
    const now = new Date().toISOString();

    const { data: supplier, error } = await supabase
      .from("Supplier")
      .insert({ id, ...parsed.data, email: parsed.data.email || null, createdAt: now, updatedAt: now })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/purchases");
    return { success: true, data: supplier as Supplier, message: "Supplier created" };
  } catch {
    return { success: false, error: "Failed to create supplier" };
  }
}

export async function getPurchaseStats() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { data: purchases } = await supabase.from("Purchase").select("totalAmount, paidAmount, category");

  const totalSpend = purchases?.reduce((s, p) => s + (p.totalAmount ?? 0), 0) ?? 0;
  const paidAmount = purchases?.reduce((s, p) => s + (p.paidAmount ?? 0), 0) ?? 0;

  const categoryMap = new Map<string, { total: number; count: number }>();
  for (const p of purchases ?? []) {
    const cat = p.category ?? "OTHER";
    const prev = categoryMap.get(cat) ?? { total: 0, count: 0 };
    categoryMap.set(cat, { total: prev.total + (p.totalAmount ?? 0), count: prev.count + 1 });
  }

  const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, { total, count }]) => ({
    category,
    _sum: { totalAmount: total },
    _count: count,
  }));

  return { totalSpend, paidAmount, dueAmount: totalSpend - paidAmount, categoryBreakdown };
}
