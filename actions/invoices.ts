"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { getScopedClient } from "@/lib/supabase-scoped";
import { getActiveBranchCookie } from "@/lib/active-branch";
import { resolveActiveBranchId, resolveReadBranchFilter, NO_ACTIVE_BRANCH_ERROR } from "@/lib/branch-context";
import { invoiceSchema, recordPaymentSchema } from "@/validators/invoice";
import { generateInvoiceNumber } from "@/lib/utils";
import * as Sentry from "@sentry/nextjs";
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
  const db = await getScopedClient(session);

  const { page = 1, pageSize = 20, status, customerId, search, dateFrom, dateTo } = params;
  const skip = (page - 1) * pageSize;
  const branchFilter = resolveReadBranchFilter(session, await getActiveBranchCookie());

  let countQ = db.from("Invoice").select("*", { count: "exact", head: true }).eq("isActive", true);
  let dataQ = db.from("Invoice").select(INVOICE_SELECT).eq("isActive", true);

  if (branchFilter) { countQ = countQ.eq("branchId", branchFilter); dataQ = dataQ.eq("branchId", branchFilter); }
  if (status) { countQ = countQ.eq("status", status); dataQ = dataQ.eq("status", status); }
  if (customerId) { countQ = countQ.eq("customerId", customerId); dataQ = dataQ.eq("customerId", customerId); }
  if (dateFrom) { countQ = countQ.gte("createdAt", new Date(dateFrom).toISOString()); dataQ = dataQ.gte("createdAt", new Date(dateFrom).toISOString()); }
  if (dateTo) { countQ = countQ.lte("createdAt", new Date(dateTo).toISOString()); dataQ = dataQ.lte("createdAt", new Date(dateTo).toISOString()); }
  if (search) {
    const safe = search.replace(/[%_,().]/g, "\\$&");
    const { data: matchedCustomers } = await db
      .from("Customer")
      .select("id")
      .ilike("name", `%${safe}%`);
    const customerIds = (matchedCustomers ?? []).map((c: any) => c.id);
    let f = `invoiceNumber.ilike.%${safe}%,internalRef.ilike.%${safe}%`;
    if (customerIds.length > 0) f += `,customerId.in.(${customerIds.join(",")})`;
    countQ = countQ.or(f);
    dataQ = dataQ.or(f);
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
  const db = await getScopedClient(session);

  const { data } = await db.from("Invoice").select(INVOICE_SELECT).eq("id", id).maybeSingle();
  return data as InvoiceWithRelations | null;
}

export async function createInvoice(data: unknown): Promise<ApiResponse<InvoiceWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  const db = await getScopedClient(session);
  const branchId = resolveActiveBranchId(session, await getActiveBranchCookie());
  if (!branchId) return { success: false, error: NO_ACTIVE_BRANCH_ERROR };

  const parsed = invoiceSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    const invoiceId = randomUUID();
    const invoiceNumber = generateInvoiceNumber();
    const now = new Date().toISOString();

    const { error: invError } = await db.from("Invoice").insert({
      id: invoiceId,
      invoiceNumber,
      customerId: parsed.data.customerId,
      orderId: parsed.data.orderId || null,
      internalRef: parsed.data.internalRef || null,
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
      branchId,
      createdAt: now,
      updatedAt: now,
    });

    if (invError) throw invError;

    if (parsed.data.items.length > 0) {
      await db.from("InvoiceItem").insert(
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

    await db.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      customerId: parsed.data.customerId,
      branchId,
      action: "CREATE",
      entity: "Invoice",
      entityId: invoiceId,
      description: `Invoice ${invoiceNumber} created`,
    });

    const { data: invoice } = await db.from("Invoice").select(INVOICE_SELECT).eq("id", invoiceId).maybeSingle();
    revalidatePath("/invoices");
    return { success: true, data: invoice as InvoiceWithRelations, message: "Invoice created successfully" };
  } catch (error) {
    Sentry.captureException(error);
    console.error("Create invoice error:", error);
    return { success: false, error: "Failed to create invoice" };
  }
}

export async function updateInvoice(id: string, data: unknown): Promise<ApiResponse<InvoiceWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  const db = await getScopedClient(session);

  const parsed = invoiceSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    const { error } = await db.from("Invoice").update({
      customerId: parsed.data.customerId,
      orderId: parsed.data.orderId || null,
      internalRef: parsed.data.internalRef || null,
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

    // Insert new items first, then delete old ones — so a failed insert never leaves the invoice itemless
    const newItemIds: string[] = [];
    if (parsed.data.items.length > 0) {
      const rows = parsed.data.items.map((item) => {
        const rowId = randomUUID();
        newItemIds.push(rowId);
        return { id: rowId, invoiceId: id, description: item.description, quantity: item.quantity, unitPrice: item.unitPrice, amount: item.amount };
      });
      const { error: itemsError } = await db.from("InvoiceItem").insert(rows);
      if (itemsError) throw itemsError;
      await db.from("InvoiceItem").delete().eq("invoiceId", id).not("id", "in", `(${newItemIds.map((x) => `"${x}"`).join(",")})`);
    } else {
      await db.from("InvoiceItem").delete().eq("invoiceId", id);
    }

    const { data: invoice } = await db.from("Invoice").select(INVOICE_SELECT).eq("id", id).maybeSingle();
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    return { success: true, data: invoice as InvoiceWithRelations, message: "Invoice updated" };
  } catch (error) {
    Sentry.captureException(error);
    console.error("Update invoice error:", error);
    return { success: false, error: "Failed to update invoice" };
  }
}

export async function recordPayment(invoiceId: string, data: unknown): Promise<ApiResponse<InvoiceWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.user.role)) {
    return { success: false, error: "Insufficient permissions to record payments" };
  }
  const db = await getScopedClient(session);

  const parsed = recordPaymentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    const { data: existing, error: fetchError } = await db
      .from("Invoice")
      .select("*")
      .eq("id", invoiceId)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) return { success: false, error: "Invoice not found" };

    const newPaid = existing.paidAmount + parsed.data.amount;
    const newDue = Math.max(0, existing.totalAmount - newPaid);
    const newStatus: InvoiceStatus = newDue <= 0 ? "PAID" : newPaid > 0 ? "PARTIAL" : existing.status;

    const { error: paymentError } = await db.from("Payment").insert({
      id: randomUUID(),
      invoiceId,
      amount: parsed.data.amount,
      method: parsed.data.method,
      methodNote: parsed.data.methodNote ?? null,
      reference: parsed.data.reference ?? null,
      notes: parsed.data.notes ?? null,
      paidAt: new Date().toISOString(),
    });
    if (paymentError) throw paymentError;

    const { error: updateError } = await db.from("Invoice").update({
      paidAmount: newPaid,
      dueAmount: newDue,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    }).eq("id", invoiceId);
    if (updateError) throw updateError;

    await db.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      customerId: existing.customerId,
      branchId: existing.branchId,
      action: "PAYMENT",
      entity: "Invoice",
      entityId: invoiceId,
      description: `Payment of AED ${parsed.data.amount} recorded on invoice ${existing.invoiceNumber}`,
    });

    const { data: invoice } = await db.from("Invoice").select(INVOICE_SELECT).eq("id", invoiceId).maybeSingle();
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoiceId}`);
    return { success: true, data: invoice as InvoiceWithRelations, message: "Payment recorded" };
  } catch (error) {
    Sentry.captureException(error);
    console.error("Record payment error:", error);
    return { success: false, error: "Failed to record payment" };
  }
}

export async function deleteInvoice(id: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return { success: false, error: "Only admins can delete invoices" };
  }
  const db = await getScopedClient(session);

  try {
    const { error } = await db.from("Invoice").update({ isActive: false, updatedAt: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    revalidatePath("/invoices");
    return { success: true, message: "Invoice deleted" };
  } catch {
    return { success: false, error: "Failed to delete invoice" };
  }
}
