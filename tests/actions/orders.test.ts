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

// One valid item — required by orderSchema (min 1)
const validItem = {
  garmentType: "Suit",
  quantity: 1,
  unitPrice: 2500,
};

const validOrder = {
  customerId: "cust-1",
  items: [validItem],
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
  customerId: "cust-1",
  garmentType: "Suit",
  status: "MEASUREMENT",
  statusHistory: [],
  items: [{ ...validItem, id: "item-1", orderId: "ord-1", sortOrder: 0 }],
  customer: { id: "cust-1", name: "Ali", email: null, phone: null },
  assignedTo: null,
  invoice: null,
  deliveryDate: validOrder.deliveryDate,
  totalAmount: 2500,
  advanceAmount: 500,
  priority: "NORMAL",
  isActive: true,
  branch: "Business Bay",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("createOrder", () => {
  it("rejects order with missing required fields", async () => {
    const result = await createOrder({ garmentType: "Suit" });
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("rejects order with no items", async () => {
    const result = await createOrder({ ...validOrder, items: [] });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/item/i);
  });

  it("rejects order with negative total amount", async () => {
    const result = await createOrder({ ...validOrder, totalAmount: -100 });
    expect(result.success).toBe(false);
  });

  it("creates order with valid data", async () => {
    const b = makeBuilder();
    // First maybeSingle → customer name lookup
    // Second maybeSingle → re-fetch full order after insert
    b.maybeSingle = vi.fn()
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
    const statuses = [
      "MEASUREMENT", "FABRIC_ORDERING", "FABRIC_COLLECTED", "CUTTING",
      "SEMI_STITCH", "TRIAL", "FINAL_STITCH", "READY_FOR_DELIVERY",
      "DELIVERED", "PENDING_ALTERATION", "READY_FINAL_DELIVERY", "ORDER_CLOSED",
    ];
    for (const status of statuses) {
      const b = makeBuilder();
      b.maybeSingle = vi.fn().mockResolvedValue({ data: { ...fakeOrder, status }, error: null });
      vi.mocked(supabase.from).mockReturnValue(b as any);
      const result = await updateOrderStatus("ord-1", status);
      expect(result.success).toBe(true);
    }
  });

  it("updates order status and returns updated status in data", async () => {
    const updatedOrder = { ...fakeOrder, status: "CUTTING" };
    const b = makeBuilder();
    // maybeSingle is called twice: once for the re-fetch, once for the ActivityLog customer lookup
    b.maybeSingle = vi.fn().mockResolvedValue({ data: updatedOrder, error: null });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const result = await updateOrderStatus("ord-1", "CUTTING", "Fabric prepped");
    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("CUTTING");
  });
});
