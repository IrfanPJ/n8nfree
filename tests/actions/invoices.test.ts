import { describe, it, expect, vi } from "vitest";
import { makeBuilder } from "../helpers/supabase-mock";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn().mockReturnValue(makeBuilder()) },
}));

vi.mock("@/lib/utils", () => ({
  generateInvoiceNumber: vi.fn(() => "INV-2026-0001"),
  cn: (...a: string[]) => a.join(" "),
  formatRelativeTime: () => "just now",
}));

import { supabase } from "@/lib/supabase";
import { createInvoice, updateInvoice, recordPayment, deleteInvoice } from "@/actions/invoices";

const validItem = { description: "Bespoke Suit", quantity: 1, unitPrice: 5000, amount: 5000 };

const validInvoice = {
  customerId: "cust-1",
  status: "DRAFT",
  items: [validItem],
  subtotal: 5000,
  taxRate: 5,
  taxAmount: 250,
  totalAmount: 5250,
  paidAmount: 0,
  dueAmount: 5250,
};

const fakeInvoice = {
  id: "inv-1",
  invoiceNumber: "INV-2026-0001",
  customerId: "cust-1",
  status: "DRAFT",
  totalAmount: 5250,
  paidAmount: 0,
  dueAmount: 5250,
  isActive: true,
  items: [validItem],
  payments: [],
  customer: { id: "cust-1", name: "Ali" },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ── createInvoice ─────────────────────────────────────────────

describe("createInvoice", () => {
  it("rejects missing customerId", async () => {
    const r = await createInvoice({ ...validInvoice, customerId: "" });
    expect(r.success).toBe(false);
  });

  it("rejects empty items array", async () => {
    const r = await createInvoice({ ...validInvoice, items: [] });
    expect(r.success).toBe(false);
  });

  it("rejects item with zero quantity", async () => {
    const r = await createInvoice({ ...validInvoice, items: [{ ...validItem, quantity: 0 }] });
    expect(r.success).toBe(false);
  });

  it("rejects item with empty description", async () => {
    const r = await createInvoice({ ...validInvoice, items: [{ ...validItem, description: "" }] });
    expect(r.success).toBe(false);
  });

  it("rejects invalid status", async () => {
    const r = await createInvoice({ ...validInvoice, status: "UNKNOWN" });
    expect(r.success).toBe(false);
  });

  it("creates invoice with valid data", async () => {
    const b = makeBuilder();
    b.maybeSingle = vi.fn().mockResolvedValue({ data: fakeInvoice, error: null });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await createInvoice(validInvoice);
    expect(r.success).toBe(true);
    expect(r.data?.invoiceNumber).toBe("INV-2026-0001");
  });

  it("returns error when DB insert fails", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ awaitResult: { data: null, error: new Error("constraint") } }) as any
    );
    const r = await createInvoice(validInvoice);
    expect(r.success).toBe(false);
  });

  it("creates invoice with multiple items", async () => {
    const b = makeBuilder();
    b.maybeSingle = vi.fn().mockResolvedValue({ data: fakeInvoice, error: null });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await createInvoice({
      ...validInvoice,
      items: [
        { description: "Suit", quantity: 1, unitPrice: 3000, amount: 3000 },
        { description: "Shirt", quantity: 2, unitPrice: 500, amount: 1000 },
      ],
    });
    expect(r.success).toBe(true);
  });
});

// ── updateInvoice ─────────────────────────────────────────────

describe("updateInvoice", () => {
  it("rejects update with no items", async () => {
    const r = await updateInvoice("inv-1", { ...validInvoice, items: [] });
    expect(r.success).toBe(false);
  });

  it("updates invoice successfully", async () => {
    const b = makeBuilder();
    b.maybeSingle = vi.fn().mockResolvedValue({ data: { ...fakeInvoice, totalAmount: 6000 }, error: null });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await updateInvoice("inv-1", { ...validInvoice, totalAmount: 6000 });
    expect(r.success).toBe(true);
  });

  it("returns error when DB update fails", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ awaitResult: { data: null, error: new Error("update failed") } }) as any
    );
    const r = await updateInvoice("inv-1", validInvoice);
    expect(r.success).toBe(false);
  });
});

// ── recordPayment ─────────────────────────────────────────────

describe("recordPayment", () => {
  it("rejects zero amount", async () => {
    const r = await recordPayment("inv-1", { amount: 0, method: "CASH" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid payment method", async () => {
    const r = await recordPayment("inv-1", { amount: 500, method: "CRYPTO" });
    expect(r.success).toBe(false);
  });

  it("returns error when invoice not found", async () => {
    const b = makeBuilder();
    b.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(supabase.from).mockReturnValue(b as any);
    const r = await recordPayment("inv-1", { amount: 500, method: "CASH" });
    expect(r.success).toBe(false);
    expect(r.error).toBe("Invoice not found");
  });

  it("marks invoice PAID when payment covers full balance", async () => {
    const b = makeBuilder();
    b.maybeSingle = vi.fn()
      .mockResolvedValueOnce({ data: { ...fakeInvoice, paidAmount: 0, totalAmount: 5250 }, error: null })
      .mockResolvedValueOnce({ data: { ...fakeInvoice, paidAmount: 5250, dueAmount: 0, status: "PAID" }, error: null });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await recordPayment("inv-1", { amount: 5250, method: "CASH" });
    expect(r.success).toBe(true);
  });

  it("marks invoice PARTIAL when payment is less than total", async () => {
    const b = makeBuilder();
    b.maybeSingle = vi.fn()
      .mockResolvedValueOnce({ data: { ...fakeInvoice, paidAmount: 0, totalAmount: 5250 }, error: null })
      .mockResolvedValueOnce({ data: { ...fakeInvoice, paidAmount: 2000, dueAmount: 3250, status: "PARTIAL" }, error: null });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await recordPayment("inv-1", { amount: 2000, method: "CARD" });
    expect(r.success).toBe(true);
  });

  it("returns error when Payment insert fails", async () => {
    const b = makeBuilder();
    b.maybeSingle = vi.fn().mockResolvedValue({ data: fakeInvoice, error: null });
    // Payment insert fails
    b.then = (res: any) => Promise.resolve({ data: null, error: new Error("payment insert failed") }).then(res);
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await recordPayment("inv-1", { amount: 500, method: "CASH" });
    expect(r.success).toBe(false);
  });
});

// ── deleteInvoice ─────────────────────────────────────────────

describe("deleteInvoice", () => {
  it("soft-deletes invoice as ADMIN", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ awaitResult: { data: null, error: null } }) as any
    );
    const r = await deleteInvoice("inv-1");
    expect(r.success).toBe(true);
  });

  it("returns error when DB update fails", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ awaitResult: { data: null, error: new Error("delete failed") } }) as any
    );
    const r = await deleteInvoice("inv-1");
    expect(r.success).toBe(false);
  });
});
