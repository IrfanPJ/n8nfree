import { vi } from "vitest";

// Mock Next.js server-only APIs
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn(() => undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: vi.fn().mockResolvedValue(new Map()),
}));

// Mock NextAuth — always returns an ADMIN session assigned to the default branch
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user-test-id", email: "admin@test.com", role: "ADMIN", name: "Test Admin", branches: ["business-bay"] },
  }),
}));

// Branch isolation is enforced via real Postgres RLS in production (see
// lib/supabase-scoped.ts), which needs a live SUPABASE_JWT_SECRET — not
// meaningful in unit tests. Route the scoped client straight to whatever
// each test file already mocks for lib/supabase, so action tests keep
// exercising their business logic without signing real tokens.
vi.mock("@/lib/supabase-scoped", () => ({
  getScopedClient: vi.fn(async () => {
    const { supabase } = await import("@/lib/supabase");
    return supabase;
  }),
}));

// Mock email send (fire-and-forget)
vi.mock("@/lib/email", () => ({
  sendAppointmentConfirmation: vi.fn().mockResolvedValue(undefined),
  sendOrderStatusUpdate: vi.fn().mockResolvedValue(undefined),
}));

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  init: vi.fn(),
}));
