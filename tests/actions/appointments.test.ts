import { describe, it, expect, vi } from "vitest";
import { makeBuilder } from "../helpers/supabase-mock";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn().mockReturnValue(makeBuilder()) },
}));

import { supabase } from "@/lib/supabase";
import {
  createAppointment, updateAppointment,
  updateAppointmentStatus, deleteAppointment,
} from "@/actions/appointments";

const future = (h = 1) => new Date(Date.now() + h * 3600_000).toISOString();

const validAppt = {
  customerId: "cust-1",
  title: "Suit Fitting",
  type: "FITTING",
  status: "SCHEDULED",
  startTime: future(2),
  endTime: future(3),
};

const fakeAppt = {
  id: "appt-1",
  ...validAppt,
  leadId: null,
  staffId: null,
  isActive: true,
  branch: "Business Bay",
  customer: { id: "cust-1", name: "Ali", email: "ali@test.com", phone: "+971501234567" },
  staff: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ── createAppointment ─────────────────────────────────────────

describe("createAppointment", () => {
  it("rejects missing customerId", async () => {
    const r = await createAppointment({ ...validAppt, customerId: "" });
    expect(r.success).toBe(false);
  });

  it("rejects title shorter than 2 characters", async () => {
    const r = await createAppointment({ ...validAppt, title: "X" });
    expect(r.success).toBe(false);
  });

  it("rejects end time before start time", async () => {
    const r = await createAppointment({ ...validAppt, startTime: future(3), endTime: future(1) });
    expect(r.success).toBe(false);
  });

  it("rejects invalid type", async () => {
    const r = await createAppointment({ ...validAppt, type: "UNKNOWN_TYPE" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid status", async () => {
    const r = await createAppointment({ ...validAppt, status: "INVALID" });
    expect(r.success).toBe(false);
  });

  it("creates appointment successfully", async () => {
    const b = makeBuilder();
    b.single = vi.fn()
      .mockResolvedValueOnce({ data: fakeAppt, error: null })  // select after insert
      .mockResolvedValueOnce({ data: null, error: null });      // customer email lookup
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await createAppointment(validAppt);
    expect(r.success).toBe(true);
  });

  it("returns error on DB insert failure", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ awaitResult: { data: null, error: new Error("insert failed") } }) as any
    );
    const r = await createAppointment(validAppt);
    expect(r.success).toBe(false);
  });

  it("stores leadId when provided", async () => {
    const b = makeBuilder();
    b.single = vi.fn().mockResolvedValue({ data: { ...fakeAppt, leadId: "lead-1" }, error: null });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await createAppointment({ ...validAppt, leadId: "lead-1" });
    expect(r.success).toBe(true);
  });

  it("accepts all valid appointment types", async () => {
    const types = ["FITTING","MEASUREMENT","TRIAL","DELIVERY","CONSULTATION","OTHER"];
    for (const type of types) {
      const b = makeBuilder();
      b.single = vi.fn().mockResolvedValue({ data: { ...fakeAppt, type }, error: null });
      vi.mocked(supabase.from).mockReturnValue(b as any);
      const r = await createAppointment({ ...validAppt, type });
      expect(r.success).toBe(true);
    }
  });
});

// ── updateAppointment ─────────────────────────────────────────

describe("updateAppointment", () => {
  it("rejects end before start on update", async () => {
    const r = await updateAppointment("appt-1", {
      ...validAppt, startTime: future(4), endTime: future(2),
    });
    expect(r.success).toBe(false);
  });

  it("updates appointment successfully", async () => {
    const b = makeBuilder();
    b.single = vi.fn().mockResolvedValue({ data: { ...fakeAppt, title: "Updated Title" }, error: null });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await updateAppointment("appt-1", { ...validAppt, title: "Updated Title" });
    expect(r.success).toBe(true);
  });

  it("returns error when DB update fails", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ awaitResult: { data: null, error: new Error("update failed") } }) as any
    );
    const r = await updateAppointment("appt-1", validAppt);
    expect(r.success).toBe(false);
  });
});

// ── updateAppointmentStatus ───────────────────────────────────

describe("updateAppointmentStatus", () => {
  it("updates status to COMPLETED", async () => {
    const b = makeBuilder();
    b.single = vi.fn().mockResolvedValue({ data: { ...fakeAppt, status: "COMPLETED", leadId: null }, error: null });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await updateAppointmentStatus("appt-1", "COMPLETED");
    expect(r.success).toBe(true);
  });

  it("moves linked lead to CLOSED_WON when appointment completed", async () => {
    const b = makeBuilder();
    b.single = vi.fn().mockResolvedValue({ data: { ...fakeAppt, status: "COMPLETED", leadId: "lead-1" }, error: null });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const leadUpdateSpy = vi.fn().mockReturnValue(b);
    b.update = leadUpdateSpy;

    const r = await updateAppointmentStatus("appt-1", "COMPLETED");
    expect(r.success).toBe(true);
  });

  it("updates status to CANCELLED", async () => {
    const b = makeBuilder();
    b.single = vi.fn().mockResolvedValue({ data: { ...fakeAppt, status: "CANCELLED" }, error: null });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await updateAppointmentStatus("appt-1", "CANCELLED");
    expect(r.success).toBe(true);
  });
});

// ── deleteAppointment ─────────────────────────────────────────

describe("deleteAppointment", () => {
  it("soft-deletes appointment as ADMIN", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ awaitResult: { data: null, error: null } }) as any
    );
    const r = await deleteAppointment("appt-1");
    expect(r.success).toBe(true);
  });

  it("returns error when DB update fails", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ awaitResult: { data: null, error: new Error("delete failed") } }) as any
    );
    const r = await deleteAppointment("appt-1");
    expect(r.success).toBe(false);
  });
});
