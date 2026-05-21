"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { invoiceSchema, recordPaymentSchema } from "@/validators/invoice";
import { generateInvoiceNumber } from "@/lib/utils";
import type { ApiResponse, InvoiceWithRelations } from "@/types";
import type { InvoiceStatus, PaymentMethod } from "@prisma/client";

export interface GetInvoicesParams {
  page?: number;
  pageSize?: number;
  status?: InvoiceStatus;
  customerId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function getInvoices(params: GetInvoicesParams = {}): Promise<{
  data: InvoiceWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { page = 1, pageSize = 20, status, customerId, search, dateFrom, dateTo } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    isActive: true,
    ...(status && { status }),
    ...(customerId && { customerId }),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) }),
          },
        }
      : {}),
    ...(search && {
      OR: [
        { invoiceNumber: { contains: search, mode: "insensitive" as const } },
        { customer: { name: { contains: search, mode: "insensitive" as const } } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { customer: true, order: true, items: true, payments: true },
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    data: data as InvoiceWithRelations[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getInvoiceById(id: string): Promise<InvoiceWithRelations | null> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, order: true, items: true, payments: true },
  }) as Promise<InvoiceWithRelations | null>;
}

export async function createInvoice(data: unknown): Promise<ApiResponse<InvoiceWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = invoiceSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    const invoiceNumber = generateInvoiceNumber();

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: parsed.data.customerId,
        orderId: parsed.data.orderId ?? null,
        status: parsed.data.status,
        subtotal: parsed.data.subtotal,
        discountType: parsed.data.discountType ?? null,
        discountValue: parsed.data.discountValue,
        taxRate: parsed.data.taxRate,
        taxAmount: parsed.data.taxAmount,
        totalAmount: parsed.data.totalAmount,
        paidAmount: parsed.data.paidAmount,
        dueAmount: parsed.data.dueAmount,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        notes: parsed.data.notes ?? null,
        terms: parsed.data.terms ?? null,
        items: {
          create: parsed.data.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
          })),
        },
      },
      include: { customer: true, order: true, items: true, payments: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        customerId: parsed.data.customerId,
        action: "CREATE",
        entity: "Invoice",
        entityId: invoice.id,
        description: `Invoice ${invoice.invoiceNumber} created`,
      },
    });

    revalidatePath("/invoices");
    return { success: true, data: invoice as InvoiceWithRelations, message: "Invoice created successfully" };
  } catch (error) {
    console.error("Create invoice error:", error);
    return { success: false, error: "Failed to create invoice" };
  }
}

export async function updateInvoice(
  id: string,
  data: unknown
): Promise<ApiResponse<InvoiceWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = invoiceSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    // Delete existing items and recreate
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        customerId: parsed.data.customerId,
        orderId: parsed.data.orderId ?? null,
        status: parsed.data.status,
        subtotal: parsed.data.subtotal,
        discountType: parsed.data.discountType ?? null,
        discountValue: parsed.data.discountValue,
        taxRate: parsed.data.taxRate,
        taxAmount: parsed.data.taxAmount,
        totalAmount: parsed.data.totalAmount,
        paidAmount: parsed.data.paidAmount,
        dueAmount: parsed.data.dueAmount,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        notes: parsed.data.notes ?? null,
        terms: parsed.data.terms ?? null,
        items: {
          create: parsed.data.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
          })),
        },
      },
      include: { customer: true, order: true, items: true, payments: true },
    });

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    return { success: true, data: invoice as InvoiceWithRelations, message: "Invoice updated" };
  } catch (error) {
    console.error("Update invoice error:", error);
    return { success: false, error: "Failed to update invoice" };
  }
}

export async function recordPayment(
  invoiceId: string,
  data: unknown
): Promise<ApiResponse<InvoiceWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = recordPaymentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    const existing = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!existing) return { success: false, error: "Invoice not found" };

    const newPaid = existing.paidAmount + parsed.data.amount;
    const newDue = Math.max(0, existing.totalAmount - newPaid);
    const newStatus: InvoiceStatus =
      newDue <= 0 ? "PAID" : newPaid > 0 ? "PARTIAL" : existing.status;

    await prisma.payment.create({
      data: {
        invoiceId,
        amount: parsed.data.amount,
        method: parsed.data.method as PaymentMethod,
        reference: parsed.data.reference ?? null,
        notes: parsed.data.notes ?? null,
      },
    });

    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaid,
        dueAmount: newDue,
        status: newStatus,
      },
      include: { customer: true, order: true, items: true, payments: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        customerId: existing.customerId,
        action: "PAYMENT",
        entity: "Invoice",
        entityId: invoiceId,
        description: `Payment of ₹${parsed.data.amount} recorded on invoice ${existing.invoiceNumber}`,
      },
    });

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoiceId}`);
    return { success: true, data: invoice as InvoiceWithRelations, message: "Payment recorded" };
  } catch (error) {
    console.error("Record payment error:", error);
    return { success: false, error: "Failed to record payment" };
  }
}

export async function deleteInvoice(id: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    await prisma.invoice.update({ where: { id }, data: { isActive: false } });
    revalidatePath("/invoices");
    return { success: true, message: "Invoice deleted" };
  } catch {
    return { success: false, error: "Failed to delete invoice" };
  }
}
