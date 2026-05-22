import { vi } from "vitest";

/**
 * Creates a fully-chainable, directly-awaitable Supabase query builder mock.
 *
 * - Awaiting the builder itself returns `awaitResult` (covers `await insert(...)` patterns).
 * - `.single()` returns `singleResult`.
 * - All other methods return the builder (for chaining).
 */
export function makeBuilder(opts: {
  singleResult?: unknown;
  awaitResult?: unknown;
} = {}) {
  const awaitResult = opts.awaitResult ?? { data: null, error: null };
  const singleResult = opts.singleResult ?? { data: null, error: null };

  const b: any = {};

  // Thenable — so `await supabase.from("T").insert(...)` resolves to awaitResult
  b.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(awaitResult).then(resolve, reject);

  const methods = ["select", "insert", "update", "delete", "upsert", "eq", "neq", "or", "and",
    "ilike", "order", "range", "not", "limit", "gt", "lt", "gte", "lte", "is", "in", "filter"];
  for (const m of methods) {
    b[m] = vi.fn().mockReturnValue(b);
  }

  b.single = vi.fn().mockResolvedValue(singleResult);
  b.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

  return b;
}

/** Wires a builder as the return value for `supabase.from` */
export function mockFrom(supabase: { from: ReturnType<typeof vi.fn> }, builder: ReturnType<typeof makeBuilder>) {
  vi.mocked(supabase.from).mockReturnValue(builder as any);
}
