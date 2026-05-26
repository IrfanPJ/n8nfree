# Claude Changes Log

Tracks all significant changes made by Claude across sessions.

---

## Session — 2026-05-26 (current, uncommitted)

### Multi-Garment Line Items + Per-Item Tailor Assignment

**Goal:** Allow each order to contain multiple garment items, each assignable to a different tailor.

#### Files changed

| File | What changed |
|------|-------------|
| `supabase/migrations/20260526_add_order_items.sql` | New `OrderItem` table — run manually in Supabase Dashboard SQL editor |
| `types/index.ts` | Added `OrderItem` type; updated `OrderWithRelations` to include `items: OrderItem[]` |
| `validators/order.ts` | Added `orderItemInputSchema`; replaced single `garmentType` field with `items` array (min 1) in `orderSchema` |
| `actions/users.ts` | Added `getAssignableStaff()` — any authenticated user can call it (not ADMIN-only) |
| `actions/orders.ts` | `ORDER_SELECT` joins `OrderItem`; `createOrder` and `updateOrder` insert/replace item rows and derive `garmentType` from items |
| `components/orders/order-form.tsx` | Full rewrite — `useFieldArray` for dynamic item cards, per-item tailor dropdown, qty x unitPrice auto-calculates total, overall responsible tailor at order level |
| `app/(dashboard)/orders/orders-client.tsx` | Detail view shows items list with per-item tailor; table row shows item count badge; print slip includes garment items table |

#### SQL migration note
The first version used `UUID` types for `id`/`orderId`/`assignedToId` which failed because `Order.id` and `User.id` are `TEXT`. Fixed to use `TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text`.

---

## Session — 2026-05-22 (committed)

### Mobile-Responsive Layout

**Commits:** `75832ba`, `582ac16`

| File | What changed |
|------|-------------|
| `app/(dashboard)/dashboard-layout-client.tsx` | Mobile drawer sidebar state, `MobileBottomNav` (5 tabs), bottom padding for nav clearance |
| `components/layout/sidebar.tsx` | Mobile drawer with Framer Motion animate, backdrop overlay, X close button, auto-close on route change |
| `components/layout/topbar.tsx` | Hamburger calls mobile toggle, hides branch selector on small screens |
| `app/(dashboard)/orders/orders-client.tsx` | Mobile kebab dropdown (always visible) replaces hover-only action buttons |

### Bespoke Designer — PDF-Exact Styling Options

**Commits:** `c475230`, `1677dc7`

| File | What changed |
|------|-------------|
| `components/orders/bespoke-designer.tsx` | Full rewrite — three-tab UI (Jacket/Shirt/Trouser), all options from the PDF styling sheet, `OptionChip` layout, live SVG preview, print spec |

**Fix:** `"Full Pick Lapel"` corrected to `"Full Pick"` (two distinct PDF options were incorrectly combined).

### Inline New Client Creation

**Commit:** `ebe5c3d`

| File | What changed |
|------|-------------|
| `components/orders/order-form.tsx` | "New Client" toggle inlines a mini form (name, phone, email) that creates the customer and auto-selects them |

---

## Earlier sessions (committed)

| Commit | Summary |
|--------|---------|
| `b9474bb` | Fix QR code not rendering in dialog — switched from canvas ref to `QRCode.toDataURL()` + `<img>` |
| `f96202c` | Add QR code generation per order |
| `9a2ec58` | Add view and print to measurements |
| `20bb3ac` | Fix Radix dialog accessibility warnings |
| `c834b5e` | Add Measurements tab to order detail dialog |
| `1b61b29` | Consolidated `supabase-all.sql` |
| `ab4c739` | 12-stage order workflow + calendar views for follow-ups & leads |
| `86248de` | Security fixes, bug fixes, project docs |
| `3cf7633` | Staff positions and team management (ADMIN only) |
