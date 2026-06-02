import { describe, it, expect, vi } from "vitest";
import { makeBuilder } from "../helpers/supabase-mock";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn().mockReturnValue(makeBuilder()) },
}));

import { supabase } from "@/lib/supabase";
import { createMeasurement, updateMeasurement, deleteMeasurement } from "@/actions/measurements";

const validMeasurement = {
  customerId: "cust-1",
  label: "Standard",
  unit: "inches" as const,
  chest: 40,
  waist: 34,
  shoulder: 17,
  sleeve: 25,
};

const fakeMeasurement = {
  id: "meas-1",
  ...validMeasurement,
  hip: null, neck: null, armhole: null,
  inseam: null, outseam: null, rise: null,
  thigh: null, ankle: null, backLength: null,
  frontLength: null, jacketLength: null, shirtLength: null,
  takenBy: "Test Admin",
  notes: null,
  takenAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ── createMeasurement ─────────────────────────────────────────

describe("createMeasurement", () => {
  it("rejects missing customerId", async () => {
    const r = await createMeasurement({ ...validMeasurement, customerId: "" });
    expect(r.success).toBe(false);
  });

  it("rejects missing label", async () => {
    const r = await createMeasurement({ ...validMeasurement, label: "" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid unit", async () => {
    const r = await createMeasurement({ ...validMeasurement, unit: "feet" });
    expect(r.success).toBe(false);
  });

  it("creates measurement with inches unit", async () => {
    const b = makeBuilder();
    b.single = vi.fn().mockResolvedValue({ data: fakeMeasurement, error: null });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await createMeasurement(validMeasurement);
    expect(r.success).toBe(true);
    expect(r.data?.label).toBe("Standard");
    expect(r.data?.unit).toBe("inches");
  });

  it("creates measurement with cm unit", async () => {
    const b = makeBuilder();
    b.single = vi.fn().mockResolvedValue({ data: { ...fakeMeasurement, unit: "cm" }, error: null });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await createMeasurement({ ...validMeasurement, unit: "cm", chest: 101.6 });
    expect(r.success).toBe(true);
  });

  it("creates measurement with only required fields (no body measurements)", async () => {
    const b = makeBuilder();
    b.single = vi.fn().mockResolvedValue({ data: { ...fakeMeasurement, chest: null, waist: null }, error: null });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await createMeasurement({ customerId: "cust-1", label: "Wedding", unit: "inches" });
    expect(r.success).toBe(true);
  });

  it("returns error on DB failure", async () => {
    const b = makeBuilder();
    b.single = vi.fn().mockResolvedValue({ data: null, error: new Error("constraint violation") });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await createMeasurement(validMeasurement);
    expect(r.success).toBe(false);
  });

  it("converts string measurements to numbers", async () => {
    const b = makeBuilder();
    b.single = vi.fn().mockResolvedValue({ data: { ...fakeMeasurement, chest: 40.5 }, error: null });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    // chest passed as string — measurementSchema converts it
    const r = await createMeasurement({ ...validMeasurement, chest: "40.5" as any });
    expect(r.success).toBe(true);
  });
});

// ── updateMeasurement ─────────────────────────────────────────

describe("updateMeasurement", () => {
  it("rejects update with empty label", async () => {
    const r = await updateMeasurement("meas-1", { ...validMeasurement, label: "" });
    expect(r.success).toBe(false);
  });

  it("updates measurement successfully", async () => {
    const b = makeBuilder();
    b.single = vi.fn().mockResolvedValue({ data: { ...fakeMeasurement, chest: 42 }, error: null });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await updateMeasurement("meas-1", { ...validMeasurement, chest: 42 });
    expect(r.success).toBe(true);
    expect(r.data?.chest).toBe(42);
  });

  it("returns error on DB failure", async () => {
    const b = makeBuilder();
    b.single = vi.fn().mockResolvedValue({ data: null, error: new Error("update failed") });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await updateMeasurement("meas-1", validMeasurement);
    expect(r.success).toBe(false);
  });
});

// ── deleteMeasurement ─────────────────────────────────────────

describe("deleteMeasurement", () => {
  it("returns error when measurement not found", async () => {
    const b = makeBuilder();
    b.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await deleteMeasurement("meas-999");
    expect(r.success).toBe(false);
    expect(r.error).toBe("Measurement not found");
  });

  it("soft-deletes measurement when found", async () => {
    const b = makeBuilder();
    b.maybeSingle = vi.fn().mockResolvedValue({ data: { customerId: "cust-1" }, error: null });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await deleteMeasurement("meas-1");
    expect(r.success).toBe(true);
    expect(r.message).toBe("Measurement deleted");
  });

  it("returns error on DB exception", async () => {
    const b = makeBuilder();
    b.maybeSingle = vi.fn().mockRejectedValue(new Error("DB error"));
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await deleteMeasurement("meas-1");
    expect(r.success).toBe(false);
  });
});
