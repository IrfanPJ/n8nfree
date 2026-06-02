import { describe, it, expect } from "vitest";
import { invoiceSchema, recordPaymentSchema } from "@/validators/invoice";

const validItem = { description: "Bespoke Suit", quantity: 1, unitPrice: 5000, amount: 5000 };

const validInvoice = {
  customerId: "cust-1",
  status: "DRAFT" as const,
  items: [validItem],
  subtotal: 5000,
  taxRate: 5,
  taxAmount: 250,
  totalAmount: 5250,
  paidAmount: 0,
  dueAmount: 5250,
};

describe("invoiceSchema", () => {
  it("accepts a valid invoice", () => {
    expect(invoiceSchema.safeParse(validInvoice).success).toBe(true);
  });

  it("rejects missing customerId", () => {
    const r = invoiceSchema.safeParse({ ...validInvoice, customerId: "" });
    expect(r.success).toBe(false);
  });

  it("rejects empty items array", () => {
    const r = invoiceSchema.safeParse({ ...validInvoice, items: [] });
    expect(r.success).toBe(false);
  });

  it("rejects item with empty description", () => {
    const r = invoiceSchema.safeParse({
      ...validInvoice,
      items: [{ description: "", quantity: 1, unitPrice: 100, amount: 100 }],
    });
    expect(r.success).toBe(false);
  });

  it("rejects item with zero quantity", () => {
    const r = invoiceSchema.safeParse({
      ...validInvoice,
      items: [{ ...validItem, quantity: 0 }],
    });
    expect(r.success).toBe(false);
  });

  it("rejects negative total amount", () => {
    const r = invoiceSchema.safeParse({ ...validInvoice, totalAmount: -100 });
    expect(r.success).toBe(false);
  });

  it("rejects tax rate above 100", () => {
    const r = invoiceSchema.safeParse({ ...validInvoice, taxRate: 101 });
    expect(r.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const r = invoiceSchema.safeParse({ ...validInvoice, status: "UNKNOWN" });
    expect(r.success).toBe(false);
  });

  it("accepts all valid statuses", () => {
    const statuses = ["DRAFT","SENT","PARTIAL","PAID","OVERDUE","CANCELLED"];
    for (const status of statuses) {
      expect(invoiceSchema.safeParse({ ...validInvoice, status }).success).toBe(true);
    }
  });

  it("coerces string numbers to numbers", () => {
    const r = invoiceSchema.safeParse({ ...validInvoice, totalAmount: "5250", taxRate: "5" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.totalAmount).toBe(5250);
      expect(r.data.taxRate).toBe(5);
    }
  });
});

describe("recordPaymentSchema", () => {
  it("accepts valid payment", () => {
    const r = recordPaymentSchema.safeParse({ amount: 1000, method: "CASH" });
    expect(r.success).toBe(true);
  });

  it("rejects zero amount", () => {
    const r = recordPaymentSchema.safeParse({ amount: 0, method: "CASH" });
    expect(r.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const r = recordPaymentSchema.safeParse({ amount: -500, method: "CASH" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid payment method", () => {
    const r = recordPaymentSchema.safeParse({ amount: 100, method: "BITCOIN" });
    expect(r.success).toBe(false);
  });

  it("accepts all valid payment methods", () => {
    const methods = ["CASH","CARD","UPI","BANK_TRANSFER","CHEQUE","OTHER"];
    for (const method of methods) {
      expect(recordPaymentSchema.safeParse({ amount: 100, method }).success).toBe(true);
    }
  });

  it("allows optional reference and notes", () => {
    const r = recordPaymentSchema.safeParse({ amount: 500, method: "CARD", reference: "REF-123", notes: "partial" });
    expect(r.success).toBe(true);
  });
});
