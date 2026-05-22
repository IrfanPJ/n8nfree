"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { invoiceSchema, recordPaymentSchema } from "@/validators/invoice";
import { generateInvoiceNumber } from "@/lib/utils";
import type { ApiResponse, InvoiceWithRelations, InvoiceStatus } from "@/types";

export interface GetInvoicesParams {
  page?: number;
  pageSize?: number;
  status?: InvoiceStatus;
  customerId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

const INVOICE_SELECT = `*, customer:Customer!customerId(*), order:Order!orderId(*), items:InvoiceItem!invoiceId(*), payments:Payment!invoiceId(*)`;

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

  let countQ = supabase.from("Invoice").select("*", { count: "exact", head: true }).eq("isActive", true);
  let dataQ = supabase.from("Invoice").select(INVOICE_SELECT).eq("isActive", true);

  if (status) { countQ = countQ.eq("status", status); dataQ = dataQ.eq("status", status); }
  if (customerId) { countQ = countQ.eq("customerId", customerId); dataQ = dataQ.eq("customerId", customerId); }
  if (dateFrom) { countQ = countQ.gte("createdAt", new Date(dateFrom).toISOString()); dataQ = dataQ.gte("createdAt", new Date(dateFrom).toISOString()); }
  if (dateTo) { countQ = countQ.lte("createdAt", new Date(dateTo).toISOString()); dataQ = dataQ.lte("createdAt", new Date(dateTo).toISOString()); }
  if (search) {
    countQ = countQ.ilike("invoiceNumber", `%${search}%`);
    dataQ = dataQ.ilike("invoiceNumber", `%${search}%`);
  }

  const [{ count: total }, { data }] = await Promise.all([
    countQ,
    dataQ.order("createdAt", { ascending: false }).range(skip, skip + pageSize - 1),
  ]);

  return {
    data: (data ?? []) as InvoiceWithRelations[],
    total: total ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((total ?? 0) / pageSize),
  };
}

export async function getInvoiceById(id: string): Promise<InvoiceWithRelations | null> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { data } = await supabase.from("Invoice").select(INVOICE_SELECT).eq("id", id).maybeSingle();
  return data as InvoiceWithRelations | null;
}

export async function createInvoice(data: unknown): Promise<ApiResponse<InvoiceWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = invoiceSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    const invoiceId = randomUUID();
    const invoiceNumber = generateInvoiceNumber();
    const now = new Date().toISOString();

    const { error: invError } = await supabase.from("Invoice").insert({
      id: invoiceId,
      invoiceNumber,
      customerId: parsed.data.customerId,
      orderId: parsed.data.orderId || null,
      status: parsed.data.status,
      subtotal: parsed.data.subtotal,
      discountType: parsed.data.discountType || null,
      discountValue: parsed.data.discountValue ?? 0,
      taxRate: parsed.data.taxRate,
      taxAmount: parsed.data.taxAmount,
      totalAmount: parsed.data.totalAmount,
      paidAmount: parsed.data.paidAmount,
      dueAmount: parsed.data.dueAmount,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate).toISOString() : null,
      notes: parsed.data.notes ?? null,
      terms: parsed.data.terms ?? null,
      createdAt: now,
      updatedAt: now,
    });

    if (invError) throw invError;

    if (parsed.data.items.length > 0) {
      await supabase.from("InvoiceItem").insert(
        parsed.data.items.map((item) => ({
          id: randomUUID(),
          invoiceId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
        }))
      );
    }

    await supabase.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      customerId: parsed.data.customerId,
      action: "CREATE",
      entity: "Invoice",
      entityId: invoiceId,
      description: `Invoice ${invoiceNumber} created`,
    });

    const { data: invoice } = await supabase.from("Invoice").select(INVOICE_SELECT).eq("id", invoiceId).single();
    revalidatePath("/invoices");
    return { success: true, data: invoice as InvoiceWithRelations, message: "Invoice created successfully" };
  } catch (error) {
    console.error("Create invoice error:", error);
    return { success: false, error: "Failed to create invoice" };
  }
}

export async function updateInvoice(id: string, data: unknown): Promise<ApiResponse<InvoiceWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = invoiceSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    await supabase.from("InvoiceItem").delete().eq("invoiceId", id);

    const { error } = await supabase.from("Invoice").update({
      customerId: parsed.data.customerId,
      orderId: parsed.data.orderId || null,
      status: parsed.data.status,
      subtotal: parsed.data.subtotal,
      discountType: parsed.data.discountType || null,
      discountValue: parsed.data.discountValue ?? 0,
      taxRate: parsed.data.taxRate,
      taxAmount: parsed.data.taxAmount,
      totalAmount: parsed.data.totalAmount,
      paidAmount: parsed.data.paidAmount,
      dueAmount: parsed.data.dueAmount,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate).toISOString() : null,
      notes: parsed.data.notes ?? null,
      terms: parsed.data.terms ?? null,
      updatedAt: new Date().toISOString(),
    }).eq("id", id);

    if (error) throw error;

    if (parsed.data.items.length > 0) {
      await supabase.from("InvoiceItem").insert(
        parsed.data.items.map((item) => ({
          id: randomUUID(),
          invoiceId: id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
        }))
      );
    }

    const { data: invoice } = await supabase.from("Invoice").select(INVOICE_SELECT).eq("id", id).single();
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    return { success: true, data: invoice as InvoiceWithRelations, message: "Invoice updated" };
  } catch (error) {
    console.error("Update invoice error:", error);
    return { success: false, error: "Failed to update invoice" };
  }
}

export async function recordPayment(invoiceId: string, data: unknown): Promise<ApiResponse<InvoiceWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = recordPaymentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    const { data: existing } = await supabase.from("Invoice").select("*").eq("id", invoiceId).single();
    if (!existing) return { success: false, error: "Invoice not found" };

    const newPaid = existing.paidAmount + parsed.data.amount;
    const newDue = Math.max(0, existing.totalAmount - newPaid);
    const newStatus: InvoiceStatus = newDue <= 0 ? "PAID" : newPaid > 0 ? "PARTIAL" : existing.status;

    await supabase.from("Payment").insert({
      id: randomUUID(),
      invoiceId,
      amount: parsed.data.amount,
      method: parsed.data.method,
      reference: parsed.data.reference ?? null,
      notes: parsed.data.notes ?? null,
      paidAt: new Date().toISOString(),
    });

    await supabase.from("Invoice").update({
      paidAmount: newPaid,
      dueAmount: newDue,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    }).eq("id", invoiceId);

    await supabase.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      customerId: existing.customerId,
      action: "PAYMENT",
      entity: "Invoice",
      entityId: invoiceId,
      description: `Payment of AED ${parsed.data.amount} recorded on invoice ${existing.invoiceNumber}`,
    });

    const { data: invoice } = await supabase.from("Invoice").select(INVOICE_SELECT).eq("id", invoiceId).single();
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
  if (session.user.role !== "ADMIN") {
    return { success: false, error: "Only admins can delete invoices" };
  }

  try {
    await supabase.from("Invoice").update({ isActive: false, updatedAt: new Date().toISOString() }).eq("id", id);
    revalidatePath("/invoices");
    return { success: true, message: "Invoice deleted" };
  } catch {
    return { success: false, error: "Failed to delete invoice" };
  }
}
