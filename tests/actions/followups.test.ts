import { describe, it, expect, vi } from "vitest";
import { makeBuilder } from "../helpers/supabase-mock";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn().mockReturnValue(makeBuilder()) },
}));

import { supabase } from "@/lib/supabase";
import { createFollowUp, updateFollowUp, deleteFollowUp } from "@/actions/followups";

const validFollowUp = {
  customerId: "cust-1",
  title: "Check suit progress",
  status: "PENDING" as const,
  priority: "NORMAL" as const,
};

const fakeFollowUp = {
  id: "fu-1",
  ...validFollowUp,
  staffId: null,
  dueDate: null,
  completedAt: null,
  isActive: true,
  customer: { id: "cust-1", name: "Ali" },
  staff: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ── createFollowUp ────────────────────────────────────────────

describe("createFollowUp", () => {
  it("rejects missing customerId", async () => {
    const r = await createFollowUp({ ...validFollowUp, customerId: "" });
    expect(r.success).toBe(false);
  });

  it("rejects title shorter than 2 characters", async () => {
    const r = await createFollowUp({ ...validFollowUp, title: "X" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid status", async () => {
    const r = await createFollowUp({ ...validFollowUp, status: "OPEN" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid priority", async () => {
    const r = await createFollowUp({ ...validFollowUp, priority: "CRITICAL" });
    expect(r.success).toBe(false);
  });

  it("creates follow-up successfully", async () => {
    const b = makeBuilder();
    b.single = vi.fn().mockResolvedValue({ data: fakeFollowUp, error: null });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await createFollowUp(validFollowUp);
    expect(r.success).toBe(true);
    expect(r.data?.title).toBe("Check suit progress");
  });

  it("accepts all valid priorities", async () => {
    const priorities = ["LOW","NORMAL","HIGH","URGENT"];
    for (const priority of priorities) {
      const b = makeBuilder();
      b.single = vi.fn().mockResolvedValue({ data: { ...fakeFollowUp, priority }, error: null });
      vi.mocked(supabase.from).mockReturnValue(b as any);
      const r = await createFollowUp({ ...validFollowUp, priority: priority as any });
      expect(r.success).toBe(true);
    }
  });

  it("accepts all valid statuses", async () => {
    const statuses = ["PENDING","IN_PROGRESS","COMPLETED","CANCELLED"];
    for (const status of statuses) {
      const b = makeBuilder();
      b.single = vi.fn().mockResolvedValue({ data: { ...fakeFollowUp, status }, error: null });
      vi.mocked(supabase.from).mockReturnValue(b as any);
      const r = await createFollowUp({ ...validFollowUp, status: status as any });
      expect(r.success).toBe(true);
    }
  });

  it("returns error on DB insert failure", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ awaitResult: { data: null, error: new Error("insert failed") } }) as any
    );
    const r = await createFollowUp(validFollowUp);
    expect(r.success).toBe(false);
  });
});

// ── updateFollowUp ────────────────────────────────────────────

describe("updateFollowUp", () => {
  it("rejects update with empty title", async () => {
    const r = await updateFollowUp("fu-1", { ...validFollowUp, title: "X" });
    expect(r.success).toBe(false);
  });

  it("updates follow-up to COMPLETED and sets completedAt", async () => {
    const b = makeBuilder();
    const now = new Date().toISOString();
    // maybeSingle for existing status check → was PENDING
    b.maybeSingle = vi.fn().mockResolvedValue({ data: { status: "PENDING", completedAt: null }, error: null });
    b.single = vi.fn().mockResolvedValue({ data: { ...fakeFollowUp, status: "COMPLETED", completedAt: now }, error: null });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await updateFollowUp("fu-1", { ...validFollowUp, status: "COMPLETED" });
    expect(r.success).toBe(true);
  });

  it("preserves original completedAt when already COMPLETED and edited", async () => {
    const originalCompletedAt = "2026-05-01T10:00:00.000Z";
    const b = makeBuilder();
    // existing: already COMPLETED
    b.maybeSingle = vi.fn().mockResolvedValue({ data: { status: "COMPLETED", completedAt: originalCompletedAt }, error: null });
    b.single = vi.fn().mockResolvedValue({ data: { ...fakeFollowUp, status: "COMPLETED", completedAt: originalCompletedAt }, error: null });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await updateFollowUp("fu-1", { ...validFollowUp, status: "COMPLETED" });
    expect(r.success).toBe(true);
    // completedAt should be the ORIGINAL one, not a new timestamp
    expect(r.data?.completedAt).toBe(originalCompletedAt);
  });

  it("clears completedAt when re-opened from COMPLETED", async () => {
    const b = makeBuilder();
    b.maybeSingle = vi.fn().mockResolvedValue({ data: { status: "COMPLETED", completedAt: "2026-05-01T10:00:00.000Z" }, error: null });
    b.single = vi.fn().mockResolvedValue({ data: { ...fakeFollowUp, status: "IN_PROGRESS", completedAt: null }, error: null });
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await updateFollowUp("fu-1", { ...validFollowUp, status: "IN_PROGRESS" });
    expect(r.success).toBe(true);
    expect(r.data?.completedAt).toBeNull();
  });

  it("returns error on DB failure", async () => {
    const b = makeBuilder();
    b.maybeSingle = vi.fn().mockResolvedValue({ data: { status: "PENDING", completedAt: null }, error: null });
    b.then = (res: any) => Promise.resolve({ data: null, error: new Error("update failed") }).then(res);
    vi.mocked(supabase.from).mockReturnValue(b as any);

    const r = await updateFollowUp("fu-1", { ...validFollowUp, status: "IN_PROGRESS" });
    expect(r.success).toBe(false);
  });
});

// ── deleteFollowUp ────────────────────────────────────────────

describe("deleteFollowUp", () => {
  it("soft-deletes follow-up", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ awaitResult: { data: null, error: null } }) as any
    );
    const r = await deleteFollowUp("fu-1");
    expect(r.success).toBe(true);
    expect(r.message).toBe("Follow-up deleted");
  });
});
