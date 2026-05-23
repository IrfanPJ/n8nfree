# Claude Code Changelog

## 2026-05-23

### 12:21 — Full code-review, debug, and security-review pass; fix all high-priority issues

#### lib/supabase.ts

- **File:** `lib/supabase.ts`
- **Function/Section:** Module initialisation
- **Type:** `bugfix`
- **Summary:** Added explicit env-var validation at startup so a missing `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` throws a descriptive error instead of a cryptic runtime crash.
- **Detail:** Replaced `!` non-null assertions with real guards. Server now fails fast with a clear message rather than silently producing `undefined` clients.

---

#### lib/auth.ts

- **File:** `lib/auth.ts`
- **Function/Section:** `loginSchema`
- **Type:** `bugfix`
- **Summary:** Raised login password minimum from 1 to 8 characters to match the signup schema and prevent brute-force against trivially short passwords.

---

#### actions/finance.ts

- **File:** `actions/finance.ts`
- **Function/Section:** `getFinanceStats()`, `getMonthlyFinance()`, `getTopClientsByRevenue()`
- **Type:** `bugfix`
- **Summary:** Wrapped all three exported functions in try-catch with Sentry exception capture; previously any DB failure caused an unhandled rejection and a blank finance page.
- **Detail:** Added `import * as Sentry from "@sentry/nextjs"` and individual try-catch blocks. Each catch returns a safe zero-value fallback so the finance page degrades gracefully instead of crashing.

---

#### actions/invoices.ts — Sentry coverage

- **File:** `actions/invoices.ts`
- **Function/Section:** `createInvoice()`, `updateInvoice()`, `recordPayment()`
- **Type:** `bugfix`
- **Summary:** Added `Sentry.captureException(error)` to all three catch blocks that previously only called `console.error`, so production errors are now tracked in error monitoring.

---

#### actions/invoices.ts — recordPayment role guard

- **File:** `actions/invoices.ts`
- **Function/Section:** `recordPayment()`
- **Type:** `bugfix` (security)
- **Summary:** Added ADMIN/MANAGER role check before recording a payment; previously any authenticated user (including STAFF) could record false payments and manipulate financial records.

---

#### actions/invoices.ts — .single() → .maybeSingle()

- **File:** `actions/invoices.ts`
- **Function/Section:** `recordPayment()`, `createInvoice()`, `updateInvoice()`
- **Type:** `bugfix`
- **Summary:** Changed three `.single()` post-write fetch calls to `.maybeSingle()`. `.single()` throws when the row is missing; `.maybeSingle()` returns null safely so the null-guard below it actually works.

---

#### actions/orders.ts — .single() → .maybeSingle()

- **File:** `actions/orders.ts`
- **Function/Section:** `createOrder()`, `updateOrder()`, `updateOrderStatus()`, `deleteOrder()`
- **Type:** `bugfix`
- **Summary:** Replaced five `.single()` calls (customer lookup + post-mutation fetches) with `.maybeSingle()` to prevent unhandled throws when a referenced record is absent.

---

#### actions/orders.ts — updateOrderDesign improvements

- **File:** `actions/orders.ts`
- **Function/Section:** `updateOrderDesign()`
- **Type:** `edit` (security + bugfix)
- **Summary:** Added input length validation (max 5000 chars), error handling with Sentry capture, and `revalidatePath` for the order detail page — previously only `/orders` was revalidated so the detail view showed stale design notes.

---

#### actions/orders.ts — getOrdersForKanban limit

- **File:** `actions/orders.ts`
- **Function/Section:** `getOrdersForKanban()`
- **Type:** `bugfix`
- **Summary:** Added `.limit(200)` to the unbounded Kanban query that previously fetched every active non-delivered order, which could load thousands of rows into memory.

---

#### hooks/use-realtime-notifications.ts

- **File:** `hooks/use-realtime-notifications.ts`
- **Function/Section:** `useRealtimeNotifications()`
- **Type:** `bugfix`
- **Summary:** Fixed two issues: (1) stored `addNotification` in a ref so it is not in the effect dependency array — the Zustand selector was recreated every render, causing the subscription to tear down and re-open on every render cycle; (2) added `channel.unsubscribe()` before `removeChannel` to ensure the server-side Realtime subscription is also closed on unmount.

---

### 12:00 — Create comprehensive project README

- **File:** `README.md`
- **Type:** `create`
- **Summary:** Wrote full project documentation covering every folder, file, server action, component, hook, store, type, validator, config file, database schema, key workflows, and environment variables.
