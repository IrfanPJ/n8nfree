"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { customerSchema } from "@/validators/customer";
import type { ApiResponse, CustomerWithRelations, PaginatedResult } from "@/types";

export async function getCustomers(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  isVIP?: boolean;
  gender?: string;
}): Promise<PaginatedResult<CustomerWithRelations>> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { page = 1, pageSize = 20, search, isVIP, gender } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    isActive: true,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search } },
      ],
    }),
    ...(typeof isVIP === "boolean" && { isVIP }),
    ...(gender && { gender: gender as "MALE" | "FEMALE" | "OTHER" }),
  };

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { orders: true, measurements: true, appointments: true, invoices: true, followUps: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    data: data as CustomerWithRelations[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getCustomerById(id: string): Promise<CustomerWithRelations | null> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.customer.findUnique({
    where: { id, isActive: true },
    include: {
      measurements: { orderBy: { takenAt: "desc" } },
      orders: { orderBy: { createdAt: "desc" }, take: 10 },
      appointments: { orderBy: { startTime: "desc" }, take: 5 },
      invoices: { orderBy: { createdAt: "desc" }, take: 5 },
      followUps: { orderBy: { createdAt: "desc" }, take: 5 },
      _count: { select: { orders: true, measurements: true, appointments: true, invoices: true, followUps: true } },
    },
  }) as Promise<CustomerWithRelations | null>;
}

export async function createCustomer(data: unknown): Promise<ApiResponse<CustomerWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = customerSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        ...parsed.data,
        email: parsed.data.email || null,
        dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
        tags: parsed.data.tags ?? [],
      },
      include: {
        _count: { select: { orders: true, measurements: true, appointments: true, invoices: true, followUps: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        customerId: customer.id,
        action: "CREATE",
        entity: "Customer",
        entityId: customer.id,
        description: `Customer "${customer.name}" was created`,
      },
    });

    revalidatePath("/customers");
    return { success: true, data: customer as CustomerWithRelations, message: "Customer created successfully" };
  } catch (error) {
    console.error("Create customer error:", error);
    return { success: false, error: "Failed to create customer" };
  }
}

export async function updateCustomer(id: string, data: unknown): Promise<ApiResponse<CustomerWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = customerSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...parsed.data,
        email: parsed.data.email || null,
        dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
        tags: parsed.data.tags ?? [],
      },
      include: {
        _count: { select: { orders: true, measurements: true, appointments: true, invoices: true, followUps: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        customerId: customer.id,
        action: "UPDATE",
        entity: "Customer",
        entityId: customer.id,
        description: `Customer "${customer.name}" was updated`,
      },
    });

    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return { success: true, data: customer as CustomerWithRelations, message: "Customer updated successfully" };
  } catch (error) {
    return { success: false, error: "Failed to update customer" };
  }
}

export async function deleteCustomer(id: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    await prisma.customer.update({ where: { id }, data: { isActive: false } });
    revalidatePath("/customers");
    return { success: true, message: "Customer deleted successfully" };
  } catch {
    return { success: false, error: "Failed to delete customer" };
  }
}
