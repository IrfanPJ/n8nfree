import { describe, it, expect } from "vitest";
import { leadSchema } from "@/validators/lead";

describe("leadSchema", () => {
  it("accepts minimal valid lead (name only)", () => {
    const r = leadSchema.safeParse({ name: "Ali" });
    expect(r.success).toBe(true);
  });

  it("defaults stage to ENQUIRY when omitted", () => {
    const r = leadSchema.safeParse({ name: "Ali" });
    if (r.success) expect(r.data.stage).toBe("ENQUIRY");
  });

  it("defaults value to 0 when omitted", () => {
    const r = leadSchema.safeParse({ name: "Ali" });
    if (r.success) expect(r.data.value).toBe(0);
  });

  it("coerces string value to number", () => {
    const r = leadSchema.safeParse({ name: "Ali", value: "3500" });
    if (r.success) expect(r.data.value).toBe(3500);
  });

  it("rejects empty name", () => {
    const r = leadSchema.safeParse({ name: "" });
    expect(r.success).toBe(false);
  });

  it("rejects missing name", () => {
    const r = leadSchema.safeParse({ phone: "+971501234567" });
    expect(r.success).toBe(false);
  });

  it("rejects negative value", () => {
    const r = leadSchema.safeParse({ name: "Ali", value: -100 });
    expect(r.success).toBe(false);
  });

  it("rejects invalid stage", () => {
    const r = leadSchema.safeParse({ name: "Ali", stage: "UNKNOWN_STAGE" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const r = leadSchema.safeParse({ name: "Ali", email: "not-an-email" });
    expect(r.success).toBe(false);
  });

  it("accepts empty string email (optional)", () => {
    const r = leadSchema.safeParse({ name: "Ali", email: "" });
    expect(r.success).toBe(true);
  });

  it("accepts all valid stages", () => {
    const stages = ["ENQUIRY","INTERESTED","QUOTED","APPOINTMENT_CONFIRMED","CLOSED_WON","CLOSED_LOST","IRRELEVANT"];
    for (const stage of stages) {
      const r = leadSchema.safeParse({ name: "Ali", stage });
      expect(r.success).toBe(true);
    }
  });

  it("accepts all valid categories A B C D", () => {
    for (const category of ["A","B","C","D"]) {
      const r = leadSchema.safeParse({ name: "Ali", category });
      expect(r.success).toBe(true);
    }
  });

  it("rejects invalid category", () => {
    const r = leadSchema.safeParse({ name: "Ali", category: "Z" });
    expect(r.success).toBe(false);
  });

  it("stores followup boolean", () => {
    const r = leadSchema.safeParse({ name: "Ali", followup: true });
    if (r.success) expect(r.data.followup).toBe(true);
  });

  it("stores visited boolean", () => {
    const r = leadSchema.safeParse({ name: "Ali", visited: true });
    if (r.success) expect(r.data.visited).toBe(true);
  });
});
