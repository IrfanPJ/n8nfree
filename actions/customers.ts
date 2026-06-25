"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { getScopedClient } from "@/lib/supabase-scoped";
import { getActiveBranchCookie } from "@/lib/active-branch";
import { resolveActiveBranchId, resolveReadBranchFilter } from "@/lib/branch-context";
import { customerSchema } from "@/validators/customer";
import { saveCustomCountry, saveCustomCity } from "@/actions/master-lists";
import * as Sentry from "@sentry/nextjs";
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
  const db = await getScopedClient(session);

  const { page = 1, pageSize = 20, search, isVIP, gender } = params;
  const skip = (page - 1) * pageSize;
  const branchFilter = resolveReadBranchFilter(session, await getActiveBranchCookie());

  let countQ = db
    .from("Customer")
    .select("*", { count: "exact", head: true })
    .eq("isActive", true);

  let dataQ = db
    .from("Customer")
    .select(`*, Order(count), Measurement(count), Appointment(count), Invoice(count), FollowUp(count)`)
    .eq("isActive", true);

  if (branchFilter) { countQ = countQ.eq("branchId", branchFilter); dataQ = dataQ.eq("branchId", branchFilter); }
  if (search) {
    const safe = search.replace(/[%_,().]/g, "\\$&");
    const f = `name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`;
    countQ = countQ.or(f);
    dataQ = dataQ.or(f);
  }
  if (typeof isVIP === "boolean") {
    countQ = countQ.eq("isVIP", isVIP);
    dataQ = dataQ.eq("isVIP", isVIP);
  }
  if (gender) {
    countQ = countQ.eq("gender", gender);
    dataQ = dataQ.eq("gender", gender);
  }

  const [{ count: total, error: countError }, { data: rawData, error: dataError }] = await Promise.all([
    countQ,
    dataQ.order("createdAt", { ascending: false }).range(skip, skip + pageSize - 1),
  ]);

  // TEMP DIAGNOSTIC: surface scoped-client/RLS errors that were previously
  // silently swallowed by `data ?? []` fallbacks. Remove once branch
  // isolation is confirmed working for non-SUPER_ADMIN roles.
  if (countError || dataError) {
    console.error(
      `getCustomers scoped-client error | role=${session.user.role} branches=${JSON.stringify(session.user.branches)} ` +
      `countError=${JSON.stringify(countError, Object.getOwnPropertyNames(countError ?? {}))} ` +
      `dataError=${JSON.stringify(dataError, Object.getOwnPropertyNames(dataError ?? {}))}`
    );
  }

  // Embedded Order(count) includes soft-deleted rows — fetch active counts separately
  const customerIds = (rawData ?? []).map((c: any) => c.id as string);
  const { data: activeOrderRows } = customerIds.length > 0
    ? await db.from("Order").select("customerId").eq("isActive", true).in("customerId", customerIds)
    : { data: [] };
  const activeOrderCount: Record<string, number> = {};
  for (const row of (activeOrderRows ?? [])) {
    activeOrderCount[(row as any).customerId] = (activeOrderCount[(row as any).customerId] ?? 0) + 1;
  }

  const data = (rawData ?? []).map((c: any) => ({
    ...c,
    Order: undefined,
    Measurement: undefined,
    Appointment: undefined,
    Invoice: undefined,
    FollowUp: undefined,
    measurements: [],
    orders: [],
    appointments: [],
    invoices: [],
    followUps: [],
    _count: {
      orders: activeOrderCount[c.id] ?? 0,
      measurements: c.Measurement?.[0]?.count ?? 0,
      appointments: c.Appointment?.[0]?.count ?? 0,
      invoices: c.Invoice?.[0]?.count ?? 0,
      followUps: c.FollowUp?.[0]?.count ?? 0,
    },
  }));

  return {
    data: data as CustomerWithRelations[],
    total: total ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((total ?? 0) / pageSize),
  };
}

export async function getCustomerById(id: string): Promise<CustomerWithRelations | null> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);

  const [
    { data: customer },
    { data: measurements },
    { data: orders },
    { data: appointments },
    { data: invoices },
    { data: followUps },
    { count: orderCount },
    { count: measurementCount },
    { count: appointmentCount },
    { count: invoiceCount },
    { count: followUpCount },
  ] = await Promise.all([
    db.from("Customer").select("*").eq("id", id).eq("isActive", true).maybeSingle(),
    db.from("Measurement").select("*").eq("customerId", id).order("takenAt", { ascending: false }),
    db.from("Order").select("*").eq("customerId", id).eq("isActive", true).order("createdAt", { ascending: false }).limit(10),
    db.from("Appointment").select("*").eq("customerId", id).order("startTime", { ascending: false }).limit(5),
    db.from("Invoice").select("*").eq("customerId", id).order("createdAt", { ascending: false }).limit(5),
    db.from("FollowUp").select("*").eq("customerId", id).order("createdAt", { ascending: false }).limit(5),
    db.from("Order").select("*", { count: "exact", head: true }).eq("customerId", id).eq("isActive", true),
    db.from("Measurement").select("*", { count: "exact", head: true }).eq("customerId", id),
    db.from("Appointment").select("*", { count: "exact", head: true }).eq("customerId", id),
    db.from("Invoice").select("*", { count: "exact", head: true }).eq("customerId", id),
    db.from("FollowUp").select("*", { count: "exact", head: true }).eq("customerId", id),
  ]);

  if (!customer) return null;

  return {
    ...customer,
    measurements: measurements ?? [],
    orders: orders ?? [],
    appointments: appointments ?? [],
    invoices: invoices ?? [],
    followUps: followUps ?? [],
    _count: {
      orders: orderCount ?? 0,
      measurements: measurementCount ?? 0,
      appointments: appointmentCount ?? 0,
      invoices: invoiceCount ?? 0,
      followUps: followUpCount ?? 0,
    },
  } as CustomerWithRelations;
}

export async function createCustomer(data: unknown): Promise<ApiResponse<CustomerWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  const db = await getScopedClient(session);
  const branchId = resolveActiveBranchId(session, await getActiveBranchCookie());

  const parsed = customerSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    const now = new Date().toISOString();
    const id = randomUUID();

    const { data: customer, error } = await db
      .from("Customer")
      .insert({
        id,
        ...parsed.data,
        email: parsed.data.email || null,
        dateOfBirth: parsed.data.dateOfBirth || null,
        area: parsed.data.area || null,
        country: parsed.data.country || null,
        countryCustom: parsed.data.countryCustom || null,
        tags: parsed.data.tags ?? [],
        branchId,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (error) throw error;

    // Save custom country/city for future autocomplete
    if (parsed.data.countryCustom) saveCustomCountry(parsed.data.countryCustom).catch(() => {});
    if (parsed.data.city) saveCustomCity(parsed.data.city, parsed.data.country || undefined).catch(() => {});

    await db.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      customerId: id,
      branchId,
      action: "CREATE",
      entity: "Customer",
      entityId: id,
      description: `Customer "${parsed.data.name}" was created`,
    });

    revalidatePath("/customers");
    return {
      success: true,
      data: { ...customer, _count: { orders: 0, measurements: 0, appointments: 0, invoices: 0, followUps: 0 } } as CustomerWithRelations,
      message: "Customer created successfully",
    };
  } catch (error) {
    Sentry.captureException(error); console.error("Create customer error:", error);
    return { success: false, error: "Failed to create customer" };
  }
}

export async function updateCustomer(id: string, data: unknown): Promise<ApiResponse<CustomerWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  const db = await getScopedClient(session);

  const parsed = customerSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    const { data: customer, error } = await db
      .from("Customer")
      .update({
        ...parsed.data,
        email: parsed.data.email || null,
        dateOfBirth: parsed.data.dateOfBirth || null,
        area: parsed.data.area || null,
        country: parsed.data.country || null,
        countryCustom: parsed.data.countryCustom || null,
        tags: parsed.data.tags ?? [],
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Save custom country/city for future autocomplete
    if (parsed.data.countryCustom) saveCustomCountry(parsed.data.countryCustom).catch(() => {});
    if (parsed.data.city) saveCustomCity(parsed.data.city, parsed.data.country || undefined).catch(() => {});

    await db.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      customerId: id,
      branchId: (customer as any)?.branchId,
      action: "UPDATE",
      entity: "Customer",
      entityId: id,
      description: `Customer "${parsed.data.name}" was updated`,
    });

    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return { success: true, data: customer as CustomerWithRelations, message: "Customer updated successfully" };
  } catch (error) {
    Sentry.captureException(error); console.error("Update customer error:", error);
    return { success: false, error: "Failed to update customer" };
  }
}

// Called when a lead moves to APPOINTMENT_CONFIRMED.
// Finds an existing customer by phone/email or creates one from the lead data.
// Returns the customer id (existing or newly created) and whether it was created.
export async function createCustomerFromLead(
  leadId: string
): Promise<{ customerId: string | null; customerName: string; isNew: boolean }> {
  const session = await auth();
  if (!session?.user) return { customerId: null, customerName: "", isNew: false };
  const db = await getScopedClient(session);

  const { data: lead } = await db.from("Lead").select("*").eq("id", leadId).maybeSingle();
  if (!lead) return { customerId: null, customerName: "", isNew: false };

  // Try matching an existing customer by phone, then email, then name
  if (lead.phone) {
    const clean = lead.phone.replace(/\s/g, "");
    const { data: byPhone } = await db
      .from("Customer").select("id, name").eq("isActive", true)
      .or(`phone.eq.${clean},phone.eq.${lead.phone}`)
      .maybeSingle();
    if (byPhone) return { customerId: byPhone.id, customerName: byPhone.name, isNew: false };
  }
  if (lead.email) {
    const { data: byEmail } = await db
      .from("Customer").select("id, name").eq("isActive", true).eq("email", lead.email).maybeSingle();
    if (byEmail) return { customerId: byEmail.id, customerName: byEmail.name, isNew: false };
  }
  // Fallback: match by exact name to prevent duplicates when phone/email are absent
  const { data: byName } = await db
    .from("Customer").select("id, name").eq("isActive", true).ilike("name", lead.name.trim()).maybeSingle();
  if (byName) return { customerId: byName.id, customerName: byName.name, isNew: false };

  // Create a new customer from lead data, in the same branch as the lead
  const id = randomUUID();
  const now = new Date().toISOString();
  const phone = lead.phone?.replace(/\s/g, "") || "0000000000"; // placeholder updated later
  const { error } = await db.from("Customer").insert({
    id,
    name: lead.name,
    phone: phone.length >= 10 ? phone : phone.padEnd(10, "0"),
    email: lead.email || null,
    gender: "OTHER",
    address: null,
    city: null,
    notes: lead.notes ? `Lead source: ${lead.source ?? ""}. ${lead.notes}` : (lead.source ? `Lead source: ${lead.source}` : null),
    tags: [],
    isVIP: false,
    branchId: lead.branchId,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  if (error) {
    console.error("createCustomerFromLead error:", error);
    return { customerId: null, customerName: lead.name, isNew: false };
  }

  await db.from("ActivityLog").insert({
    id: randomUUID(),
    userId: session.user.id,
    customerId: id,
    branchId: lead.branchId,
    action: "CREATE",
    entity: "Customer",
    entityId: id,
    description: `Customer "${lead.name}" auto-created from lead on appointment confirmation`,
  });

  revalidatePath("/customers");
  return { customerId: id, customerName: lead.name, isNew: true };
}

export async function deleteCustomer(id: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.user.role)) {
    return { success: false, error: "Insufficient permissions" };
  }
  const db = await getScopedClient(session);

  try {
    await db
      .from("Customer")
      .update({ isActive: false, updatedAt: new Date().toISOString() })
      .eq("id", id);

    revalidatePath("/customers");
    return { success: true, message: "Customer deleted successfully" };
  } catch {
    return { success: false, error: "Failed to delete customer" };
  }
}

// Moves a customer to a different branch going forward. Deliberately does
// NOT touch their existing Order/Appointment/Invoice/Measurement rows —
// those keep the branchId they were created with, so historical records
// stay attributed to the branch that actually served them.
export async function transferCustomerBranch(customerId: string, newBranchId: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return { success: false, error: "Insufficient permissions" };
  }
  const db = await getScopedClient(session);

  const { data: customer } = await db.from("Customer").select("id, name, branchId").eq("id", customerId).maybeSingle();
  if (!customer) return { success: false, error: "Customer not found" };

  const { error } = await db
    .from("Customer")
    .update({ branchId: newBranchId, updatedAt: new Date().toISOString() })
    .eq("id", customerId);

  if (error) return { success: false, error: error.message };

  await db.from("ActivityLog").insert({
    id: randomUUID(),
    userId: session.user.id,
    customerId,
    branchId: newBranchId,
    action: "UPDATE",
    entity: "Customer",
    entityId: customerId,
    description: `Customer "${customer.name}" was transferred from branch ${customer.branchId} to ${newBranchId}`,
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  return { success: true, message: "Customer transferred successfully" };
}
