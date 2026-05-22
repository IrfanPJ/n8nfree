import { describe, it, expect, vi } from "vitest";
import { makeBuilder } from "../helpers/supabase-mock";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn().mockReturnValue(makeBuilder()) },
}));

import { supabase } from "@/lib/supabase";
import { createCustomer, updateCustomer, deleteCustomer } from "@/actions/customers";

const validCustomer = {
  name: "Ali Hassan",
  phone: "+971501234567",
  gender: "MALE" as const,
  email: "ali@example.com",
  city: "Dubai",
  tags: [],
  isVIP: false,
};

const fakeStoredCustomer = {
  id: "cust-1",
  ...validCustomer,
  branch: "Main",
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("createCustomer", () => {
  it("rejects invalid input — missing required fields", async () => {
    const result = await createCustomer({ phone: "+971501234567" });
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("rejects empty name", async () => {
    const result = await createCustomer({ ...validCustomer, name: "" });
    expect(result.success).toBe(false);
  });

  it("creates a customer with valid data", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ singleResult: { data: fakeStoredCustomer, error: null } }) as any
    );

    const result = await createCustomer(validCustomer);
    expect(result.success).toBe(true);
    expect(result.data?.name).toBe("Ali Hassan");
  });

  it("returns error on DB failure", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ singleResult: { data: null, error: new Error("unique constraint") } }) as any
    );

    const result = await createCustomer(validCustomer);
    expect(result.success).toBe(false);
  });
});

describe("updateCustomer", () => {
  it("rejects update with empty name", async () => {
    const result = await updateCustomer("cust-1", { name: "" });
    expect(result.success).toBe(false);
  });

  it("updates a customer with valid data", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ singleResult: { data: fakeStoredCustomer, error: null } }) as any
    );

    const result = await updateCustomer("cust-1", validCustomer);
    expect(result.success).toBe(true);
    expect(result.data?.id).toBe("cust-1");
  });
});

describe("deleteCustomer", () => {
  it("soft-deletes a customer as ADMIN", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      makeBuilder({ awaitResult: { data: null, error: null } }) as any
    );
    const result = await deleteCustomer("cust-1");
    expect(result.success).toBe(true);
  });
});
