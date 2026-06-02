"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { customerSchema } from "@/validators/customer";
import * as Sentry from "@sentry/nextjs";
import type { ApiResponse, CustomerWithRelations, PaginatedResult } from "@/types";

export async function getCustomers(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  isVIP?: boolean;
  gender?: string;
  branch?: string;
}): Promise<PaginatedResult<CustomerWithRelations>> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { page = 1, pageSize = 20, search, isVIP, gender } = params;
  const skip = (page - 1) * pageSize;

  let countQ = supabase
    .from("Customer")
    .select("*", { count: "exact", head: true })
    .eq("isActive", true);

  let dataQ = supabase
    .from("Customer")
    .select(`*, Order(count), Measurement(count), Appointment(count), Invoice(count), FollowUp(count)`)
    .eq("isActive", true);

  if (search) {
    const f = `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`;
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

  const [{ count: total }, { data: rawData }] = await Promise.all([
    countQ,
    dataQ.order("createdAt", { ascending: false }).range(skip, skip + pageSize - 1),
  ]);

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
      orders: c.Order?.[0]?.count ?? 0,
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
    supabase.from("Customer").select("*").eq("id", id).eq("isActive", true).maybeSingle(),
    supabase.from("Measurement").select("*").eq("customerId", id).order("takenAt", { ascending: false }),
    supabase.from("Order").select("*").eq("customerId", id).order("createdAt", { ascending: false }).limit(10),
    supabase.from("Appointment").select("*").eq("customerId", id).order("startTime", { ascending: false }).limit(5),
    supabase.from("Invoice").select("*").eq("customerId", id).order("createdAt", { ascending: false }).limit(5),
    supabase.from("FollowUp").select("*").eq("customerId", id).order("createdAt", { ascending: false }).limit(5),
    supabase.from("Order").select("*", { count: "exact", head: true }).eq("customerId", id),
    supabase.from("Measurement").select("*", { count: "exact", head: true }).eq("customerId", id),
    supabase.from("Appointment").select("*", { count: "exact", head: true }).eq("customerId", id),
    supabase.from("Invoice").select("*", { count: "exact", head: true }).eq("customerId", id),
    supabase.from("FollowUp").select("*", { count: "exact", head: true }).eq("customerId", id),
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

  const parsed = customerSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    const now = new Date().toISOString();
    const id = randomUUID();

    const { data: customer, error } = await supabase
      .from("Customer")
      .insert({
        id,
        ...parsed.data,
        email: parsed.data.email || null,
        dateOfBirth: parsed.data.dateOfBirth || null,
        tags: parsed.data.tags ?? [],
        branch: "Business Bay",
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      customerId: id,
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

  const parsed = customerSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    const { data: customer, error } = await supabase
      .from("Customer")
      .update({
        ...parsed.data,
        email: parsed.data.email || null,
        dateOfBirth: parsed.data.dateOfBirth || null,
        tags: parsed.data.tags ?? [],
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      customerId: id,
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

export async function deleteCustomer(id: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!["ADMIN", "MANAGER"].includes(session.user.role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  try {
    await supabase
      .from("Customer")
      .update({ isActive: false, updatedAt: new Date().toISOString() })
      .eq("id", id);

    revalidatePath("/customers");
    return { success: true, message: "Customer deleted successfully" };
  } catch {
    return { success: false, error: "Failed to delete customer" };
  }
}
