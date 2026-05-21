"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import type { ApiResponse, PaginatedResult, PurchaseWithRelations } from "@/types";

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
}): Promise<PaginatedResult<PurchaseWithRelations>> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { page = 1, pageSize = 20, search, category, supplierId } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(supplierId && { supplierId }),
    ...(category && { category }),
    ...(search && {
      OR: [
        { itemName: { contains: search, mode: "insensitive" as const } },
        { itemCode: { contains: search, mode: "insensitive" as const } },
        { supplier: { name: { contains: search, mode: "insensitive" as const } } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { purchaseDate: "desc" },
      include: { supplier: true },
    }),
    prisma.purchase.count({ where }),
  ]);

  return { data: data as PurchaseWithRelations[], total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createPurchase(data: unknown): Promise<ApiResponse<PurchaseWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = purchaseSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  try {
    const purchase = await prisma.purchase.create({
      data: {
        ...parsed.data,
        supplierId: parsed.data.supplierId || null,
        purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : new Date(),
      },
      include: { supplier: true },
    });

    revalidatePath("/purchases");
    return { success: true, data: purchase as PurchaseWithRelations, message: "Purchase recorded" };
  } catch {
    return { success: false, error: "Failed to create purchase" };
  }
}

export async function getSuppliers() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

export async function createSupplier(data: unknown) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = supplierSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  try {
    const supplier = await prisma.supplier.create({
      data: { ...parsed.data, email: parsed.data.email || null },
    });
    revalidatePath("/purchases");
    return { success: true, data: supplier, message: "Supplier created" };
  } catch {
    return { success: false, error: "Failed to create supplier" };
  }
}

export async function getPurchaseStats() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const [totalSpend, paidAmount, categoryBreakdown] = await Promise.all([
    prisma.purchase.aggregate({ _sum: { totalAmount: true } }),
    prisma.purchase.aggregate({ _sum: { paidAmount: true } }),
    prisma.purchase.groupBy({
      by: ["category"],
      _sum: { totalAmount: true },
      _count: true,
    }),
  ]);

  return {
    totalSpend: totalSpend._sum.totalAmount ?? 0,
    paidAmount: paidAmount._sum.paidAmount ?? 0,
    dueAmount: (totalSpend._sum.totalAmount ?? 0) - (paidAmount._sum.paidAmount ?? 0),
    categoryBreakdown,
  };
}
