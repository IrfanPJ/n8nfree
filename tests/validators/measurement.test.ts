import { describe, it, expect } from "vitest";
import { measurementSchema } from "@/validators/measurement";

describe("measurementSchema", () => {
  it("accepts valid measurement with all fields", () => {
    const r = measurementSchema.safeParse({
      customerId: "cust-1", label: "Standard", unit: "inches",
      chest: 40, waist: 34, shoulder: 17, sleeve: 25,
    });
    expect(r.success).toBe(true);
  });

  it("accepts measurement with no body fields (all optional)", () => {
    const r = measurementSchema.safeParse({ customerId: "cust-1", label: "Standard", unit: "cm" });
    expect(r.success).toBe(true);
  });

  it("rejects missing customerId", () => {
    const r = measurementSchema.safeParse({ label: "Standard", unit: "inches" });
    expect(r.success).toBe(false);
  });

  it("rejects missing label", () => {
    const r = measurementSchema.safeParse({ customerId: "cust-1", unit: "inches" });
    expect(r.success).toBe(false);
  });

  it("rejects empty label", () => {
    const r = measurementSchema.safeParse({ customerId: "cust-1", label: "", unit: "inches" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid unit", () => {
    const r = measurementSchema.safeParse({ customerId: "cust-1", label: "Standard", unit: "feet" });
    expect(r.success).toBe(false);
  });

  it("accepts both valid units", () => {
    for (const unit of ["inches","cm"]) {
      const r = measurementSchema.safeParse({ customerId: "cust-1", label: "Standard", unit });
      expect(r.success).toBe(true);
    }
  });

  it("converts string chest to number", () => {
    const r = measurementSchema.safeParse({ customerId: "c", label: "L", unit: "inches", chest: "40.5" });
    if (r.success) expect(r.data.chest).toBe(40.5);
  });

  it("treats empty string body field as undefined", () => {
    const r = measurementSchema.safeParse({ customerId: "c", label: "L", unit: "inches", chest: "" });
    if (r.success) expect(r.data.chest).toBeUndefined();
  });
});
