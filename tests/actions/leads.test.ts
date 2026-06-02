import { describe, it, expect, vi } from "vitest";
import { makeBuilder } from "../helpers/supabase-mock";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn().mockReturnValue(makeBuilder()) },
}));

import { supabase } from "@/lib/supabase";
import { createLead, updateLead, updateLeadStage, deleteLead, bulkCreateLeads } from "@/actions/leads";

const validLead = {
  name: "Ahmed Khan",
  phone: "+971501234567",
  email: "ahmed@test.com",
  interest: "Wedding suit",
  stage: "ENQUIRY" as const,
  source: "WhatsApp",
  notes: "Very interested",
  value: 5000,
};

const fakeLead = {
  id: "lead-1",
  ...validLead,
  category: null, handler: null, transferredTo: null,
  visited: false, followup: false, isActive: true,
  branch: "Business Bay",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ── createLead ────────────────────────────────────────────────

describe("createLead", () => {
  it("rejects missing name", async () => {
    const r = await createLead({ phone: "+971501234567" });
    expect(r.success).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it("rejects empty name", async () => {
    const r = await createLead({ ...validLead, name: "" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid stage", async () => {
    const r = await createLead({ ...validLead, stage: "FLYING" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid category", async () => {
    const r = await createLead({ ...validLead, category: "Z" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid email", async () => {
    const r = await createLead({ ...validLead, email: "not-email" });
    expect(r.success).toBe(false);
  });

  it("creates lead successfully with valid data", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ singleResult: { data: fakeLead, error: null } }) as any
    );
    const r = await createLead(validLead);
    expect(r.success).toBe(true);
    expect(r.data?.name).toBe("Ahmed Khan");
  });

  it("accepts all valid categories", async () => {
    for (const category of ["A","B","C","D"]) {
      vi.mocked(supabase.from).mockReturnValue(
        makeBuilder({ singleResult: { data: { ...fakeLead, category }, error: null } }) as any
      );
      const r = await createLead({ ...validLead, category: category as any });
      expect(r.success).toBe(true);
    }
  });

  it("creates lead with CLOSED_WON stage", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ singleResult: { data: { ...fakeLead, stage: "CLOSED_WON" }, error: null } }) as any
    );
    const r = await createLead({ ...validLead, stage: "CLOSED_WON" });
    expect(r.success).toBe(true);
    expect(r.data?.stage).toBe("CLOSED_WON");
  });

  it("returns error on DB failure", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ awaitResult: { data: null, error: new Error("db error") } }) as any
    );
    const r = await createLead(validLead);
    expect(r.success).toBe(false);
  });
});

// ── updateLead ────────────────────────────────────────────────

describe("updateLead", () => {
  it("rejects empty name on update", async () => {
    const r = await updateLead("lead-1", { ...validLead, name: "" });
    expect(r.success).toBe(false);
  });

  it("updates lead successfully", async () => {
    const updated = { ...fakeLead, name: "Mohammed Ali", value: 8000 };
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ singleResult: { data: updated, error: null } }) as any
    );
    const r = await updateLead("lead-1", { ...validLead, name: "Mohammed Ali", value: 8000 });
    expect(r.success).toBe(true);
    expect(r.data?.name).toBe("Mohammed Ali");
    expect(r.data?.value).toBe(8000);
  });

  it("returns error when DB update fails", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ awaitResult: { data: null, error: new Error("update failed") } }) as any
    );
    const r = await updateLead("lead-1", validLead);
    expect(r.success).toBe(false);
  });
});

// ── updateLeadStage ───────────────────────────────────────────

describe("updateLeadStage", () => {
  it("moves lead to APPOINTMENT_CONFIRMED", async () => {
    const updated = { ...fakeLead, stage: "APPOINTMENT_CONFIRMED" };
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ singleResult: { data: updated, error: null } }) as any
    );
    const r = await updateLeadStage("lead-1", "APPOINTMENT_CONFIRMED");
    expect(r.success).toBe(true);
    expect(r.data?.stage).toBe("APPOINTMENT_CONFIRMED");
  });

  it("moves lead to CLOSED_WON", async () => {
    const updated = { ...fakeLead, stage: "CLOSED_WON" };
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ singleResult: { data: updated, error: null } }) as any
    );
    const r = await updateLeadStage("lead-1", "CLOSED_WON");
    expect(r.success).toBe(true);
    expect(r.data?.stage).toBe("CLOSED_WON");
  });

  it("returns error when DB update fails", async () => {
    const b = makeBuilder({ awaitResult: { data: null, error: new Error("failed") } });
    vi.mocked(supabase.from).mockReturnValue(b as any);
    const r = await updateLeadStage("lead-1", "INTERESTED");
    expect(r.success).toBe(false);
  });
});

// ── deleteLead ────────────────────────────────────────────────

describe("deleteLead", () => {
  it("soft-deletes a lead as ADMIN", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ awaitResult: { data: null, error: null } }) as any
    );
    const r = await deleteLead("lead-1");
    expect(r.success).toBe(true);
  });
});

// ── bulkCreateLeads ───────────────────────────────────────────

describe("bulkCreateLeads", () => {
  it("rejects when all rows have no name", async () => {
    const r = await bulkCreateLeads([{ phone: "123" }, { email: "x@x.com" }]);
    expect(r.success).toBe(false);
    expect(r.data?.errors.length).toBeGreaterThan(0);
  });

  it("imports only valid rows, reports errors for invalid", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ awaitResult: { data: null, error: null } }) as any
    );
    const r = await bulkCreateLeads([
      validLead,
      { phone: "bad-no-name" },          // invalid: no name
      { ...validLead, name: "Row 3" },
      { ...validLead, name: "Row 4", category: "Z" }, // invalid category
    ]);
    expect(r.success).toBe(true);
    expect(r.data?.imported).toBe(2);
    expect(r.data?.errors).toHaveLength(2);
  });

  it("returns error when DB insert fails", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ awaitResult: { data: null, error: new Error("bulk insert failed") } }) as any
    );
    const r = await bulkCreateLeads([validLead, { ...validLead, name: "Row 2" }]);
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/database error/i);
  });

  it("handles 100 valid rows", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ awaitResult: { data: null, error: null } }) as any
    );
    const rows = Array.from({ length: 100 }, (_, i) => ({ ...validLead, name: `Lead ${i + 1}` }));
    const r = await bulkCreateLeads(rows);
    expect(r.success).toBe(true);
    expect(r.data?.imported).toBe(100);
  });
});
