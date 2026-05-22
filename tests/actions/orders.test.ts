import { describe, it, expect, vi } from "vitest";
import { makeBuilder } from "../helpers/supabase-mock";

// Inline factory — no external references at hoist time
vi.mock("@/lib/supabase", () => {
  const b: any = {};
  const then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve({ data: null, error: null }).then(resolve, reject);
  b.then = then;
  const methods = ["select", "insert", "update", "delete", "eq", "or", "ilike", "order", "range", "not", "limit", "gt", "lt", "gte", "lte", "upsert"];
  for (const m of methods) b[m] = vi.fn().mockReturnValue(b);
  b.single = vi.fn().mockResolvedValue({ data: null, error: null });
  b.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  return { supabase: { from: vi.fn().mockReturnValue(b) } };
});

vi.mock("@/lib/utils", () => ({
  generateOrderNumber: vi.fn(() => "ORD-2026-0001"),
  cn: (...args: string[]) => args.join(" "),
  formatRelativeTime: () => "just now",
}));

import { supabase } from "@/lib/supabase";
import { createOrder, updateOrderStatus } from "@/actions/orders";

const validOrder = {
  customerId: "cust-1",
  garmentType: "Suit",
  deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  totalAmount: 2500,
  advanceAmount: 500,
  priority: "NORMAL" as const,
  fabricName: "Italian Wool",
  fabricColor: "Navy",
  fabricQuantity: 3,
};

const fakeOrder = {
  id: "ord-1",
  orderNumber: "ORD-2026-0001",
  ...validOrder,
  status: "PENDING",
  statusHistory: [],
  customer: { id: "cust-1", name: "Ali", email: null },
  assignedTo: null,
  invoice: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isActive: true,
  branch: "Main",
};

describe("createOrder", () => {
  it("rejects order with missing required fields", async () => {
    const result = await createOrder({ garmentType: "Suit" });
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("rejects order with negative total amount", async () => {
    const result = await createOrder({ ...validOrder, totalAmount: -100 });
    expect(result.success).toBe(false);
  });

  it("creates order with valid data", async () => {
    const b = makeBuilder({ singleResult: { data: { name: "Ali" }, error: null } });
    (b.single as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: { name: "Ali" }, error: null })
      .mockResolvedValueOnce({ data: fakeOrder, error: null });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const result = await createOrder(validOrder);
    if (!result.success) console.error("createOrder failed:", result.error);
    expect(result.success).toBe(true);
    expect(result.data?.orderNumber).toBe("ORD-2026-0001");
  });

  it("returns error when DB insert fails", async () => {
    const b = makeBuilder({ awaitResult: { data: null, error: new Error("constraint") } });
    vi.mocked(supabase.from).mockReturnValue(b as any);
    const result = await createOrder(validOrder);
    expect(result.success).toBe(false);
  });
});

describe("updateOrderStatus", () => {
  it("rejects invalid status value", async () => {
    const result = await updateOrderStatus("ord-1", "NOT_A_STATUS");
    expect(result.success).toBe(false);
  });

  it("accepts all valid status values", async () => {
    const statuses = ["PENDING", "MEASURING", "CUTTING", "STITCHING", "TRIAL", "READY", "DELIVERED", "CANCELLED"];
    for (const status of statuses) {
      const b = makeBuilder({ singleResult: { data: { ...fakeOrder, status }, error: null } });
      vi.mocked(supabase.from).mockReturnValue(b as any);
      const result = await updateOrderStatus("ord-1", status);
      expect(result.success).toBe(true);
    }
  });

  it("updates order status with optional notes", async () => {
    const b = makeBuilder({ singleResult: { data: { ...fakeOrder, status: "CUTTING" }, error: null } });
    vi.mocked(supabase.from).mockReturnValue(b as any);
    const result = await updateOrderStatus("ord-1", "CUTTING", "Fabric prepped");
    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("CUTTING");
  });
});
