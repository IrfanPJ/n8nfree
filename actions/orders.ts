"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { orderSchema, orderStatusUpdateSchema } from "@/validators/order";
import { generateOrderNumber } from "@/lib/utils";
import type {
  ApiResponse,
  OrderWithRelations,
  PaginatedResult,
  OrderStatus,
} from "@/types";

export async function getOrders(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  priority?: string;
}): Promise<PaginatedResult<OrderWithRelations>> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { page = 1, pageSize = 20, search, status, priority } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    isActive: true,
    ...(status && {
      status: status as OrderStatus,
    }),
    ...(priority && {
      priority: priority as "LOW" | "NORMAL" | "HIGH" | "URGENT",
    }),
    ...(search && {
      OR: [
        { orderNumber: { contains: search, mode: "insensitive" as const } },
        { garmentType: { contains: search, mode: "insensitive" as const } },
        { fabricName: { contains: search, mode: "insensitive" as const } },
        {
          customer: {
            name: { contains: search, mode: "insensitive" as const },
          },
        },
        {
          customer: {
            phone: { contains: search },
          },
        },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        assignedTo: true,
        invoice: true,
        statusHistory: { orderBy: { changedAt: "desc" }, take: 5 },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data: data as OrderWithRelations[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getOrderById(id: string): Promise<OrderWithRelations | null> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.order.findUnique({
    where: { id, isActive: true },
    include: {
      customer: true,
      assignedTo: true,
      invoice: true,
      statusHistory: { orderBy: { changedAt: "desc" } },
    },
  }) as Promise<OrderWithRelations | null>;
}

export async function createOrder(data: unknown): Promise<ApiResponse<OrderWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = orderSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Validation failed",
    };
  }

  try {
    const orderNumber = generateOrderNumber();

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: parsed.data.customerId,
        garmentType: parsed.data.garmentType,
        fabricName: parsed.data.fabricName ?? null,
        fabricColor: parsed.data.fabricColor ?? null,
        fabricQuantity: parsed.data.fabricQuantity ?? null,
        deliveryDate: new Date(parsed.data.deliveryDate),
        trialDate: parsed.data.trialDate ? new Date(parsed.data.trialDate) : null,
        totalAmount: parsed.data.totalAmount,
        advanceAmount: parsed.data.advanceAmount,
        priority: parsed.data.priority,
        designNotes: parsed.data.designNotes ?? null,
        notes: parsed.data.notes ?? null,
        assignedToId: parsed.data.assignedToId ?? null,
        status: "PENDING",
        statusHistory: {
          create: {
            status: "PENDING",
            notes: "Order created",
            changedBy: session.user.id,
          },
        },
      },
      include: {
        customer: true,
        assignedTo: true,
        invoice: true,
        statusHistory: { orderBy: { changedAt: "desc" } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        customerId: order.customerId,
        orderId: order.id,
        action: "CREATE",
        entity: "Order",
        entityId: order.id,
        description: `Order "${order.orderNumber}" was created for ${order.customer.name}`,
      },
    });

    revalidatePath("/orders");
    return {
      success: true,
      data: order as OrderWithRelations,
      message: `Order ${orderNumber} created successfully`,
    };
  } catch (error) {
    console.error("Create order error:", error);
    return { success: false, error: "Failed to create order" };
  }
}

export async function updateOrder(
  id: string,
  data: unknown
): Promise<ApiResponse<OrderWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = orderSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Validation failed",
    };
  }

  try {
    const order = await prisma.order.update({
      where: { id },
      data: {
        customerId: parsed.data.customerId,
        garmentType: parsed.data.garmentType,
        fabricName: parsed.data.fabricName ?? null,
        fabricColor: parsed.data.fabricColor ?? null,
        fabricQuantity: parsed.data.fabricQuantity ?? null,
        deliveryDate: new Date(parsed.data.deliveryDate),
        trialDate: parsed.data.trialDate ? new Date(parsed.data.trialDate) : null,
        totalAmount: parsed.data.totalAmount,
        advanceAmount: parsed.data.advanceAmount,
        priority: parsed.data.priority,
        designNotes: parsed.data.designNotes ?? null,
        notes: parsed.data.notes ?? null,
        assignedToId: parsed.data.assignedToId ?? null,
      },
      include: {
        customer: true,
        assignedTo: true,
        invoice: true,
        statusHistory: { orderBy: { changedAt: "desc" } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        customerId: order.customerId,
        orderId: order.id,
        action: "UPDATE",
        entity: "Order",
        entityId: order.id,
        description: `Order "${order.orderNumber}" was updated`,
      },
    });

    revalidatePath("/orders");
    revalidatePath(`/orders/${id}`);
    return {
      success: true,
      data: order as OrderWithRelations,
      message: "Order updated successfully",
    };
  } catch (error) {
    console.error("Update order error:", error);
    return { success: false, error: "Failed to update order" };
  }
}

export async function updateOrderStatus(
  id: string,
  status: string,
  notes?: string
): Promise<ApiResponse<OrderWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = orderStatusUpdateSchema.safeParse({ status, notes });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid status",
    };
  }

  try {
    const [order] = await Promise.all([
      prisma.order.update({
        where: { id },
        data: {
          status: parsed.data.status,
          statusHistory: {
            create: {
              status: parsed.data.status,
              notes: parsed.data.notes ?? null,
              changedBy: session.user.id,
            },
          },
        },
        include: {
          customer: true,
          assignedTo: true,
          invoice: true,
          statusHistory: { orderBy: { changedAt: "desc" } },
        },
      }),
    ]);

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        customerId: order.customerId,
        orderId: order.id,
        action: "STATUS_UPDATE",
        entity: "Order",
        entityId: order.id,
        description: `Order "${order.orderNumber}" status changed to ${parsed.data.status}`,
        metadata: { status: parsed.data.status, notes: parsed.data.notes },
      },
    });

    revalidatePath("/orders");
    revalidatePath(`/orders/${id}`);
    return {
      success: true,
      data: order as OrderWithRelations,
      message: `Order status updated to ${parsed.data.status}`,
    };
  } catch (error) {
    console.error("Update order status error:", error);
    return { success: false, error: "Failed to update order status" };
  }
}

export async function deleteOrder(id: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const order = await prisma.order.update({
      where: { id },
      data: { isActive: false },
      select: { orderNumber: true, customerId: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        customerId: order.customerId,
        orderId: id,
        action: "DELETE",
        entity: "Order",
        entityId: id,
        description: `Order "${order.orderNumber}" was deleted`,
      },
    });

    revalidatePath("/orders");
    return { success: true, message: "Order deleted successfully" };
  } catch (error) {
    console.error("Delete order error:", error);
    return { success: false, error: "Failed to delete order" };
  }
}

export async function getOrdersForKanban(): Promise<OrderWithRelations[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const orders = await prisma.order.findMany({
    where: {
      isActive: true,
      status: {
        notIn: ["DELIVERED", "CANCELLED"],
      },
    },
    orderBy: [{ priority: "desc" }, { deliveryDate: "asc" }],
    include: {
      customer: true,
      assignedTo: true,
      invoice: true,
      statusHistory: { orderBy: { changedAt: "desc" }, take: 1 },
    },
  });

  return orders as OrderWithRelations[];
}
