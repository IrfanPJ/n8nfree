import { describe, it, expect } from "vitest";
import { appointmentSchema } from "@/validators/appointment";

const future = (offsetHours = 1) =>
  new Date(Date.now() + offsetHours * 60 * 60 * 1000).toISOString();

const validAppt = {
  customerId: "cust-1",
  title: "Suit Fitting",
  type: "FITTING" as const,
  status: "SCHEDULED" as const,
  startTime: future(2),
  endTime: future(3),
};

describe("appointmentSchema", () => {
  it("accepts a valid appointment", () => {
    expect(appointmentSchema.safeParse(validAppt).success).toBe(true);
  });

  it("rejects missing customerId", () => {
    const r = appointmentSchema.safeParse({ ...validAppt, customerId: "" });
    expect(r.success).toBe(false);
  });

  it("rejects title shorter than 2 characters", () => {
    const r = appointmentSchema.safeParse({ ...validAppt, title: "X" });
    expect(r.success).toBe(false);
  });

  it("rejects end time before start time", () => {
    const r = appointmentSchema.safeParse({
      ...validAppt,
      startTime: future(3),
      endTime: future(2),   // before start
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toContain("endTime");
  });

  it("rejects equal start and end time", () => {
    const t = future(2);
    const r = appointmentSchema.safeParse({ ...validAppt, startTime: t, endTime: t });
    expect(r.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const r = appointmentSchema.safeParse({ ...validAppt, type: "INVALID" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const r = appointmentSchema.safeParse({ ...validAppt, status: "UNKNOWN" });
    expect(r.success).toBe(false);
  });

  it("accepts all valid appointment types", () => {
    const types = ["FITTING","MEASUREMENT","TRIAL","DELIVERY","CONSULTATION","OTHER"];
    for (const type of types) {
      expect(appointmentSchema.safeParse({ ...validAppt, type }).success).toBe(true);
    }
  });

  it("accepts all valid statuses", () => {
    const statuses = ["SCHEDULED","CONFIRMED","IN_PROGRESS","COMPLETED","CANCELLED","NO_SHOW"];
    for (const status of statuses) {
      expect(appointmentSchema.safeParse({ ...validAppt, status }).success).toBe(true);
    }
  });

  it("allows optional leadId", () => {
    const r = appointmentSchema.safeParse({ ...validAppt, leadId: "lead-1" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.leadId).toBe("lead-1");
  });
});
