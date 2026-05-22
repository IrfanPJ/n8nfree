import { vi } from "vitest";

// Mock Next.js server-only APIs
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock NextAuth — always returns an ADMIN session
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user-test-id", email: "admin@test.com", role: "ADMIN", name: "Test Admin" },
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
