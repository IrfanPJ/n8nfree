# Code Review — HTCRM
**Date:** 2026-05-27
**Reviewer:** Claude Sonnet 4.6
**Scope:** Full codebase audit — bugs, security, performance, maintainability

---

## Severity Legend
| Level | Meaning |
|-------|---------|
| Critical | Data loss, full auth bypass, or immediate production risk |
| High | Exploitable under realistic conditions, significant data exposure |
| Medium | Degrades correctness or security under specific conditions |
| Low | Code quality, minor edge cases, latent risk |

---

## Bugs

### [Critical] `updateOrder` — silent data loss on partial failure
**File:** `actions/orders.ts:245–261`

Items are deleted first, then re-inserted in a separate query. There is no transaction. If the insert fails, the `Order` row is already updated and all `OrderItem` rows are gone. The catch block returns a generic error while the DB is left corrupt — order with no items, no recovery path without manual intervention.

**Fix:** Reverse the order — insert new items first, swap on success, then delete old ones. Or store old items, delete, insert, re-insert originals on failure. Supabase JS has no transaction support so work around it with a DB function or compensating write.

---

### [Critical] `processOrderScan` — no status transition guard
**File:** `actions/scan.ts:92`

The permission check only validates *who* can set a stage, not *whether the current order state makes that transition legal*. A TAILOR can scan any order in MEASUREMENT and set it to SEMI_STITCH. Stage can move backwards. The same order scanned twice rapidly gets duplicate history entries.

**Fix:**
```ts
const { data: current } = await supabase
  .from("Order").select("status").eq("id", orderId).single();
if (current?.status === newStatus)
  return { success: false, error: "Order is already in this stage" };
```
For full protection add a `VALID_TRANSITIONS` map.

---

### [High] `processOrderScan` — `newStatus` has no runtime enum validation
**File:** `actions/scan.ts:70`

Typed as `OrderStatus` in TypeScript, but server actions are callable over HTTP — the type is erased at runtime. `allowedStages.includes(newStatus)` guards against out-of-permission stages, but an arbitrary string can still be written to the DB if POSITION_STAGE_MAP has unexpected values. `updateOrderStatus` uses Zod; `processOrderScan` does not.

**Fix:**
```ts
import { orderStatusUpdateSchema } from "@/validators/order";
const parsed = orderStatusUpdateSchema.safeParse({ status: newStatus });
if (!parsed.success) return { success: false, error: "Invalid status" };
```

---

### [High] `getOrders` — PostgREST filter injection
**File:** `actions/orders.ts:43`

```ts
const f = `orderNumber.ilike.%${search}%,garmentType.ilike.%${search}%,...`;
dataQ = dataQ.or(f);
```

The search string is interpolated directly into a PostgREST filter expression. A crafted value like `a%,isActive.eq.false` appends a new OR condition, leaking soft-deleted orders. This is not SQL injection (PostgREST parameterises the final SQL) but it is filter-level injection through the PostgREST parser.
**Reference:** OWASP A03:2021 — CWE-943

**Fix:** Escape special characters before interpolating:
```ts
const safe = search.replace(/[%_,().]/g, "\\$&");
const f = `orderNumber.ilike.%${safe}%,...`;
```

---

### [Medium] `CameraScanner` — stream leak on flip during `getUserMedia`
**File:** `components/scan/camera-scanner.tsx:28–79`

`startCamera` is async. When `facingMode` changes, the effect cleanup calls `stopStream()`, but `stopStream` only cancels the RAF and stops `streamRef.current`. If `getUserMedia` is still in-flight at cleanup time, `streamRef.current` is null. When the promise later resolves, a new stream is assigned to `streamRef.current` — orphaned, never stopped, camera light stays on.

**Fix:** Track a cancellation flag inside `startCamera`:
```ts
let cancelled = false;
const stream = await navigator.mediaDevices.getUserMedia(...);
if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
// in cleanup: cancelled = true
```

---

### [Medium] `CameraScanner` — canvas resized on every frame
**File:** `camera-scanner.tsx:52–53`

`canvas.width = video.videoWidth` on every animation frame. Setting canvas dimensions clears the bitmap and triggers a layout recalculation — 60 times per second on a 1280×720 stream.

**Fix:** Set dimensions once when video metadata loads, not inside the scan loop.

---

### [Medium] `CameraScanner` — jsQR running at 60fps drains mobile battery
**File:** `camera-scanner.tsx:67`

`requestAnimationFrame` targets 60fps. jsQR on a full 1280×720 frame takes 5–15ms per call on mid-range phones, pegging a CPU core and draining battery in under 5 minutes.

**Fix:** Throttle to ~10fps:
```ts
let last = 0;
const scan = (ts: number) => {
  rafRef.current = requestAnimationFrame(scan);
  if (ts - last < 100) return; // ~10fps
  last = ts;
  // ... decode
};
```

---

### [Medium] `ORDER_SELECT` duplicated across two files
**Files:** `actions/orders.ts:13`, `actions/scan.ts:11`

Identical string defined in two places. When a relation is added to one, the other silently returns a different shape. Already diverged once (items relation).

**Fix:** Extract to `lib/order-select.ts` and import in both.

---

### [Low] ActivityLog failure silently masks a successful status update
**File:** `actions/scan.ts:120–130`

`ActivityLog.insert()` is inside the `try/catch`. If it fails, the function returns `"Failed to update order status"` even though the Order status and OrderHistory were already written. The user sees an error, retries, and creates a duplicate history entry.

**Fix:** Fire-and-forget the ActivityLog insert:
```ts
supabase.from("ActivityLog").insert({ ... }).catch(() => {});
```

---

## Security

### [Critical] Open registration — new accounts get full access immediately
**File:** `actions/auth.ts:41–51`

Anyone can POST to the signup endpoint. New users are created with `isActive: true` and `pagePermissions: null`. `null` means **unrestricted** — `if (!pagePermissions) return true` in `lib/permissions.ts:27`. An attacker, former employee, or curious visitor can register and immediately read all customers, orders, invoices, and leads with no approval step.
**Reference:** OWASP A07:2021 — Identification and Authentication Failures

**Fix (fast):** Change signup defaults:
```ts
isActive: false,
pagePermissions: [],
```
Add an admin "activate account" step. Or remove the public signup route entirely and have admins create accounts via a protected server action.

---

### [High] JWT role is stale — demoted admins retain access until token expiry
**File:** `lib/auth.ts:51–57`

`role` is baked into the JWT at login. If you demote an ADMIN to STAFF via `updateTeamMember`, their session JWT still has `role: "ADMIN"` until it expires. `processOrderScan` and `updateUserPermissions` both use `session.user.role` from the JWT. `pagePermissions` avoids this by fetching fresh from DB — role should do the same.

**Fix (fast):** Shorten JWT `maxAge` to 1 hour in `authConfig`.
**Fix (proper):** Fetch role from DB in each sensitive action, same pattern as `pagePermissions` in the layout.

---

### [High] `updateOrderDesign` — no role check, any authenticated user can overwrite design notes
**File:** `actions/orders.ts:394`

Only checks `!session?.user`. Any STAFF member can overwrite design notes on any order. `updateOrder` similarly has no role restriction — any logged-in user can modify customer, amounts, and delivery dates.

**Fix:**
```ts
if (!["ADMIN", "MANAGER"].includes(session.user.role))
  return { success: false, error: "Insufficient permissions" };
```

---

### [Medium] Service role key bypasses all RLS
**File:** `lib/supabase.ts:9`

Every DB operation uses the service role key, which bypasses Supabase Row Level Security entirely. All authorization is enforced in application code only. Any bug in an action's auth check exposes the full table. Defense-in-depth requires RLS policies as a second layer.
**Reference:** OWASP A01:2021 — Broken Access Control

---

### [Medium] Sentry captures exceptions that may contain PII
**Files:** `actions/scan.ts:147`, `actions/orders.ts:200,283`

Supabase error objects can contain query snippets, row data, and user IDs. These are passed to `Sentry.captureException()` and `console.error()`. Sending customer names, order details, and user IDs to a third-party error service may violate data-handling obligations.

**Fix:** Scrub context before capturing:
```ts
Sentry.captureException(error, { extra: { orderId, action: "processOrderScan" } });
// pass only identifiers, not the raw error object
```

---

### [Low] `MANAGER` role dead-code in `deleteOrder`
**File:** `actions/orders.ts:362`

`["ADMIN", "MANAGER"].includes(session.user.role)` — there is no MANAGER role in the signup or role-update flows. Looks like defense-in-depth but is actually a latent privilege escalation: if MANAGER is introduced anywhere without a full access-control audit, delete access is silently granted.

---

## Performance

### [High] Realtime `router.refresh()` fan-out will not scale
**File:** `app/(dashboard)/orders/orders-client.tsx:220–230`

With 50 concurrent users on the orders page, every Order update triggers 50 simultaneous `router.refresh()` calls. Each one hits Vercel serverless, runs `getOrders()`, executes the full paginated query, and re-renders server components. At 10× traffic a burst of 5 scans triggers 250 server renders in seconds — Vercel will cold-start and queue.

**Fix:** Patch only the changed row in local state instead of a full refresh:
```ts
.on("postgres_changes", { event: "UPDATE", ... }, (payload) => {
  setData(prev => ({
    ...prev,
    data: prev.data.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o),
  }));
})
```
Reserve `router.refresh()` for INSERT and DELETE events only.

---

### [Medium] `statusHistory` sorted in JS for every order on every fetch
**File:** `actions/orders.ts:62–64`

For 200 kanban orders with 10 history entries each, that is 2000 sort operations in Node after every fetch. This should be an `ORDER BY` in the PostgREST join, not a JS sort.

---

### [Medium] `processOrderScan` — 4–5 sequential Supabase round-trips
**File:** `actions/scan.ts:77–130`

User fetch → order update → history insert → order re-fetch → activity insert. All sequential at ~30–50ms each = 150–250ms minimum latency on mobile over a slow connection. The re-fetch at line 114 exists only to get `orderNumber` for the log message — but `orderNumber` is already available from the client-side `order` prop.

**Fix:** Remove the re-fetch. Pass `orderNumber` as a parameter or omit it from the log.

---

## Architecture Questions

### Top 3 risks with this approach
1. **Open registration + `null` = full access** — a single POST request away from a complete data breach by anyone who finds the signup URL.
2. **Stale JWT role** — permission revocation has a blind-spot window that can last hours depending on session lifetime.
3. **No status transition validation** — the workflow can reach impossible states (MEASUREMENT → DELIVERED) with no enforcement or audit trail of who caused it.

### What would break first at 10× scale
The realtime `router.refresh()` fan-out. Every scan event broadcasts to all connected clients and triggers a full server-side re-render for each one. 50 users × 10 scans/minute = 500 full page re-fetches per minute. Vercel cold-starts stack up, the orders query (with `ORDER_SELECT` joining 5 tables) gets hammered, and the UX degrades for everyone simultaneously.

### Simplest version to ship first
Three changes that block the most damage:
1. `isActive: false` and `pagePermissions: []` on signup — blocks data exposure from open registration.
2. Zod enum validation on `processOrderScan` — closes the server action type bypass.
3. Escape the search string before `.or()` — closes the filter injection.

Everything else is hardening that can be done in the next sprint.

### Alternatives to consider
- **Supabase RLS** instead of application-layer-only auth — if any server action has a missing auth check, RLS is the last line of defence.
- **Optimistic local state updates** instead of `router.refresh()` — patch the changed order in `data` state directly from the Realtime payload instead of re-fetching everything.
- **`supabase gen types`** to replace the pervasive `as any` casts with generated types — would have caught the UUID/TEXT mismatch in the migration before it hit production.
- **`setInterval` at 100ms** instead of `requestAnimationFrame` for jsQR — 10× less battery drain for no loss in scan responsiveness.

### Given more time
Add RLS policies on `Order` and `Customer` tables. Switch from service role to `@supabase/ssr` scoped client. Add a `VALID_TRANSITIONS` map for status changes. Move `ORDER_SELECT` to a shared constant. Replace all `as any` with generated types. Add an invite-only user creation flow.

### Given less time
Fix only the open signup default permissions (`isActive: false`, `pagePermissions: []`). That is the only issue where a complete outsider with no prior knowledge can take one action and read all customer data.

---

*Generated by Claude Sonnet 4.6 — 2026-05-27*
