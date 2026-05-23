# House of Tailors CRM

A production-grade, multi-branch CRM built for luxury tailoring businesses. Handles the full customer lifecycle — from lead enquiry through bespoke garment design, order production, invoicing, and follow-up — with real-time notifications, AI assistant, and bilingual (EN/AR) support.

**Live:** https://htcrm.vercel.app  
**Stack:** Next.js 16 · React 19 · TypeScript · Supabase · Tailwind CSS 4 · NextAuth v5

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [App Router Pages](#app-router-pages)
3. [API Routes](#api-routes)
4. [Server Actions](#server-actions)
5. [Library & Utilities](#library--utilities)
6. [Components](#components)
7. [Hooks](#hooks)
8. [State Stores](#state-stores)
9. [Types](#types)
10. [Validators](#validators)
11. [Config Files](#config-files)
12. [Database Schema](#database-schema)
13. [Key Workflows](#key-workflows)
14. [Environment Variables](#environment-variables)

---

## Project Structure

```
htcrm/
├── actions/              # Next.js server actions (DB mutations)
├── app/                  # Next.js App Router (pages + API routes)
│   ├── (auth)/           # Unauthenticated routes: login, signup
│   ├── (dashboard)/      # Protected routes: all CRM pages
│   └── api/              # REST API endpoints
├── components/           # React components
│   ├── ui/               # Shadcn/Radix primitive UI components
│   ├── appointments/     # Appointment-specific components
│   ├── customers/        # Customer-specific components
│   ├── dashboard/        # Dashboard charts and stat cards
│   ├── invoices/         # Invoice form and view components
│   ├── layout/           # Sidebar, topbar
│   ├── measurements/     # Measurement form component
│   ├── orders/           # Order form, kanban, bespoke designer
│   └── shared/           # Cross-feature: search, branches, locale, notifications
├── hooks/                # Custom React hooks
├── lib/                  # Auth, Supabase clients, email, utilities
├── messages/             # i18n JSON files (en.json, ar.json)
├── public/               # Static assets (images, icons)
├── store/                # Zustand global state stores
├── tests/                # Vitest unit tests
├── types/                # TypeScript type definitions
└── validators/           # Zod validation schemas
```

---

## App Router Pages

### Root

| File | Description |
|------|-------------|
| `app/layout.tsx` | Root layout. Applies Geist + Playfair fonts, wraps app in `Providers` (session, theme, toaster), sets `lang`/`dir` from locale cookie. |
| `app/page.tsx` | Entry point. Redirects authenticated users to `/dashboard`, others to `/login`. |
| `app/providers.tsx` | Client wrapper. Mounts `SessionProvider`, `ThemeProvider`, `Toaster`, and registers the service worker. |

### Auth Group — `app/(auth)/`

| File | Description |
|------|-------------|
| `layout.tsx` | Centered, full-screen layout for auth pages. |
| `login/page.tsx` | Email + password login form. Calls NextAuth `signIn("credentials", ...)`. Redirects to `/dashboard` on success. |
| `signup/page.tsx` | Registration form (name, email, password, role). Calls `signupUser()` server action. Shows inline errors. |
| `error.tsx` | Error boundary for auth routes; displays user-friendly error UI. |

### Dashboard Group — `app/(dashboard)/`

All pages in this group are protected. The group layout checks for a valid session and redirects to `/login` if missing.

| File / Directory | Description |
|------------------|-------------|
| `layout.tsx` | Fetches session, creates Supabase activity log entry on visit, wraps content in `DashboardLayoutClient`. |
| `dashboard-layout-client.tsx` | Client component. Renders `Sidebar`, `Topbar`, main content area, and mounts `useRealtimeNotifications`. |
| `error.tsx` | Error boundary for all dashboard routes. |

#### Dashboard — `dashboard/page.tsx`

Executive overview. Fetches in parallel:
- `getDashboardStats()` → stat cards (pending orders, customers, revenue, new customers)
- `getRevenueData()` → 30-day revenue line chart
- `getOrderStatusDistribution()` → pie chart
- `getRecentActivities()` → activity feed
- `getUrgentOrders()` → overdue/rush orders list
- `getCapacityData()` → staff workload bar
- `getBookingHeatmap()` → appointments by day-of-week
- Today's appointments and delivery-ready orders

Rendered with `dynamic = "force-dynamic"` (never cached).

#### Customers — `customers/`

| File | Description |
|------|-------------|
| `page.tsx` | Server component. Fetches paginated customer list with optional VIP filter and search. Renders customer table + `CustomerForm` modal. |
| `[id]/page.tsx` | Customer detail. Shows profile, all orders, measurements history, invoices, appointments, follow-ups, and leads for one customer. |

#### Orders — `orders/`

| File | Description |
|------|-------------|
| `page.tsx` | Toggle between Kanban and list view. Fetches all orders with branch filter. Renders `OrderKanban` or table + `OrderForm` modal. |

#### Appointments — `appointments/`

| File | Description |
|------|-------------|
| `page.tsx` | Calendar + list of scheduled appointments. Supports date-range filter. Renders `AppointmentForm` modal for creation/editing. |

#### Invoices — `invoices/`

| File | Description |
|------|-------------|
| `page.tsx` | Invoice list with status filters (DRAFT/SENT/PAID/OVERDUE). Shows summary totals. |
| `[id]/page.tsx` | Invoice detail. Renders line items, payment history, and printable `InvoiceView`. |

#### Measurements — `measurements/`

| File | Description |
|------|-------------|
| `page.tsx` | All measurement records across customers, searchable. Links to customer profile. |

#### Fabrics — `fabrics/`

| File | Description |
|------|-------------|
| `page.tsx` | Fabric inventory table with low-stock alerts (quantity <= reorderLevel shown in red). `FabricForm` modal for CRUD. |

#### Leads — `leads/`

| File | Description |
|------|-------------|
| `page.tsx` | Sales pipeline in kanban columns: ENQUIRY → QUOTED → CLOSED_WON / CLOSED_LOST. Drag to change stage. |

#### Finance — `finance/`

| File | Description |
|------|-------------|
| `page.tsx` | Revenue analytics. Monthly breakdown, payment method split, top customers by spend, overdue invoice summary. |

#### Follow-ups — `followups/`

| File | Description |
|------|-------------|
| `page.tsx` | Task list with priority and due date. Filter by status. `FollowUpForm` modal for creation. |

#### Purchases — `purchases/`

| File | Description |
|------|-------------|
| `page.tsx` | Purchase orders from suppliers. Status tracking (PENDING/ORDERED/RECEIVED). Linked to Fabric inventory updates. |

#### Point of Sale — `pos/`

| File | Description |
|------|-------------|
| `page.tsx` | Retail POS interface. Product grid, cart, payment method selection, receipt generation. |

#### Notifications — `notifications/`

| File | Description |
|------|-------------|
| `page.tsx` | Full notification inbox. Mark-as-read, filter by type, clear all. |

#### Settings — `settings/`

| File | Description |
|------|-------------|
| `page.tsx` | User preferences (theme, language), account info, system configuration (branch management, staff roles for admins). |

#### AI Assistant — `ai-assistant/`

| File | Description |
|------|-------------|
| `page.tsx` | Chat interface with streaming OpenAI responses. Sends business context (orders, revenue, customers) in the system prompt. Rate-limited to 20 requests/minute. |

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `api/auth/[...nextauth]/route.ts` | GET, POST | NextAuth credential login handler. Exports `{ GET, POST }` from `handlers`. |
| `api/ai/chat/route.ts` | POST | Streams OpenAI GPT-4o-mini completions. Accepts `{ messages, context }`. Rate-limited per IP (20/min via in-memory map). Returns `ReadableStream`. |
| `api/customers/list/route.ts` | GET | Returns customers as JSON. Accepts `?search=` and `?branch=` query params. |
| `api/notifications/route.ts` | GET | Returns unread notifications for the current session user. |
| `api/search/route.ts` | GET | Global search. Accepts `?q=`. Searches orders (orderNumber, garmentType, fabricName), customers (name, phone, email), and leads (enquiryDetails). Returns categorised results. |

---

## Server Actions

Located in `/actions/`. All functions are `async` and marked `"use server"`. They use the service-role Supabase client (bypasses RLS) and call `revalidatePath()` after mutations.

### `actions/auth.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `signupUser` | `(data: SignupData) => { success, error }` | Hashes password with bcrypt (10 rounds), inserts new User row, returns result. |

### `actions/customers.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `getCustomers` | `(opts?) => PaginatedResult<Customer>` | Paginated customer list with optional filters (page, limit, search, branch, isVIP). |
| `getCustomerById` | `(id: string) => Customer or null` | Single customer with all related data (orders, measurements, invoices). |
| `createCustomer` | `(data: CustomerFormData) => { success, data, error }` | Inserts customer, revalidates `/customers`. |
| `updateCustomer` | `(id, data) => { success, data, error }` | Updates customer fields, revalidates path. |
| `deleteCustomer` | `(id) => { success, error }` | Soft-deletes (sets `isActive = false`). |
| `searchCustomers` | `(query) => Customer[]` | ilike search on name, email, phone — used in order form dropdown. |

### `actions/orders.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `getOrders` | `(opts?) => PaginatedResult<Order>` | Cursor-based paginated orders with filters (status, priority, branch, search). |
| `getOrderById` | `(id) => Order or null` | Single order with history and customer. |
| `createOrder` | `(data) => { success, data, error }` | Auto-generates `orderNumber` (`HOT-[timestamp]-[random]`), inserts Order, creates initial `OrderHistory` entry. |
| `updateOrder` | `(id, data) => { success, data, error }` | Updates order fields. |
| `updateOrderStatus` | `(id, status, notes?) => { success, error }` | Updates `Order.status`, appends `OrderHistory` record. Triggers email if configured. |
| `deleteOrder` | `(id) => { success, error }` | Soft-delete. |
| `getOrdersByCustomer` | `(customerId) => Order[]` | All orders for one customer. |

### `actions/appointments.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `getAppointments` | `(opts?) => Appointment[]` | All appointments with optional date range and branch filters. |
| `getAppointmentById` | `(id) => Appointment or null` | Single appointment with customer and staff. |
| `createAppointment` | `(data) => { success, data, error }` | Inserts appointment, sends confirmation email via Resend. |
| `updateAppointment` | `(id, data) => { success, error }` | Updates appointment fields. |
| `cancelAppointment` | `(id) => { success, error }` | Sets status to `CANCELLED`. |
| `confirmAppointment` | `(id) => { success, error }` | Sets status to `CONFIRMED`. |

### `actions/invoices.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `getInvoices` | `(opts?) => Invoice[]` | Invoices with optional status and branch filters. |
| `getInvoiceById` | `(id) => Invoice or null` | Invoice with items and payments. |
| `createInvoice` | `(data) => { success, data, error }` | Auto-generates `invoiceNumber` (`INV-2025-[timestamp]`), calculates totals, inserts Invoice + InvoiceItems. |
| `recordPayment` | `(invoiceId, data) => { success, error }` | Inserts Payment, updates `Invoice.paidAmount` and `dueAmount`, auto-sets status to `PAID` when fully settled. |
| `updateInvoice` | `(id, data) => { success, error }` | Updates invoice fields. |

### `actions/measurements.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `getMeasurements` | `(opts?) => Measurement[]` | All measurements, filterable by customer. |
| `getMeasurementsByCustomer` | `(customerId) => Measurement[]` | History of measurements for one customer. |
| `createMeasurement` | `(data) => { success, data, error }` | Inserts 20+ body dimensions. |
| `updateMeasurement` | `(id, data) => { success, error }` | Updates measurement record. |

### `actions/fabrics.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `getFabrics` | `(opts?) => Fabric[]` | Fabric inventory list. |
| `getLowStockFabrics` | `() => Fabric[]` | Returns fabrics where `quantity <= reorderLevel`. |
| `createFabric` | `(data) => { success, data, error }` | Inserts fabric record. |
| `updateFabric` | `(id, data) => { success, error }` | Updates fabric (quantity, supplier, etc.). |
| `deleteFabric` | `(id) => { success, error }` | Removes fabric record. |

### `actions/leads.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `getLeads` | `(opts?) => Lead[]` | All leads with optional status filter. |
| `createLead` | `(data) => { success, data, error }` | Creates new lead enquiry. |
| `updateLeadStatus` | `(id, status) => { success, error }` | Advances lead through pipeline stages. |
| `updateLead` | `(id, data) => { success, error }` | Updates lead fields. |

### `actions/followups.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `getFollowUps` | `(opts?) => FollowUp[]` | All follow-up tasks with filters. |
| `createFollowUp` | `(data) => { success, data, error }` | Creates follow-up task. |
| `updateFollowUpStatus` | `(id, status) => { success, error }` | Updates task status. |
| `completeFollowUp` | `(id) => { success, error }` | Sets status to `COMPLETED`. |

### `actions/finance.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `getRevenueData` | `(days?) => RevenuePoint[]` | Daily revenue aggregation for the last N days. |
| `getPaymentSummary` | `() => PaymentSummary` | Breakdown by payment method. |
| `getTopCustomers` | `(limit?) => CustomerSpend[]` | Customers ranked by total spend. |
| `getOverdueInvoices` | `() => Invoice[]` | Invoices past due date and not fully paid. |

### `actions/purchases.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `getPurchases` | `() => Purchase[]` | All purchase orders with supplier info. |
| `createPurchase` | `(data) => { success, data, error }` | Creates purchase order, optionally updates fabric quantity on receipt. |
| `updatePurchaseStatus` | `(id, status) => { success, error }` | Marks purchase as ORDERED or RECEIVED. |

### `actions/pos.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `getPOSTransactions` | `() => POSTransaction[]` | Retail transaction history. |
| `createPOSTransaction` | `(data) => { success, data, error }` | Records sale, decrements product stock. |

### `actions/products.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `getProducts` | `() => Product[]` | Product catalog for POS. |
| `updateProductStock` | `(id, quantity) => { success, error }` | Adjusts stock quantity. |

### `actions/dashboard.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `getDashboardStats` | `() => DashboardStats` | Counts: pending orders, total customers, MTD revenue, new customers this month. |
| `getOrderStatusDistribution` | `() => StatusCount[]` | Count of orders per status for pie chart. |
| `getRecentActivities` | `(limit?) => Activity[]` | Latest activity log entries with actor info. |
| `getUrgentOrders` | `() => Order[]` | Orders where delivery date < today and not delivered. |
| `getCapacityData` | `() => CapacityData` | Active orders per staff member. |
| `getBookingHeatmap` | `() => HeatmapData[]` | Appointment count by day-of-week. |
| `getTodayAppointments` | `() => Appointment[]` | Appointments scheduled for today. |
| `getDeliveryReadyOrders` | `() => Order[]` | Orders at READY_FOR_DELIVERY status. |

### `actions/users.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `getUsers` | `() => User[]` | All staff accounts (ADMIN only). |
| `createUser` | `(data) => { success, error }` | Creates staff account with hashed password. |
| `updateUser` | `(id, data) => { success, error }` | Updates user role, position, active status. |
| `deactivateUser` | `(id) => { success, error }` | Sets `isActive = false`. |

### `actions/locale.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `setLocale` | `(locale: "en" or "ar") => void` | Sets `NEXT_LOCALE` cookie, triggers page reload for RTL switch. |

---

## Library & Utilities

### `lib/auth.ts`

NextAuth v5 configuration.

```typescript
export const { handlers, auth, signIn, signOut } = NextAuth(config)
```

- **`handlers`** — `{ GET, POST }` mounted at `api/auth/[...nextauth]`
- **`auth()`** — Returns current session or `null`; used in server components and middleware
- **`signIn(provider, opts)`** — Initiates credential login
- **`signOut()`** — Clears session and redirects

Uses `CredentialsProvider` with `bcrypt.compare()` for password verification. On success, JWT contains `{ id, email, name, role }`.

### `lib/auth.config.ts`

NextAuth strategy and redirect configuration.

- Session strategy: `"jwt"`
- `signIn` page: `/login`
- Callbacks extend JWT and Session with user `role` and `id`

### `lib/supabase.ts`

Server-side Supabase client using the service role key. Bypasses RLS. Used exclusively in server actions and API routes.

```typescript
export const supabase = createClient(url, serviceKey)
```

### `lib/supabase-browser.ts`

Client-side Supabase client using the anon key. Respects RLS policies. Lazy-initialized singleton used for Realtime subscriptions.

```typescript
export function getSupabaseBrowser(): SupabaseClient | null
```

Returns `null` if environment variables are missing (safe during SSR).

### `lib/supabase-rls.ts`

Helper functions for setting Supabase application-level config used by RLS policies.

```typescript
setAppUserId(client, userId)     // SET app.user_id = '...'
setAppUserRole(client, role)     // SET app.user_role = '...'
```

### `lib/email.ts`

Resend email client and template functions.

```typescript
sendAppointmentConfirmation(appointment, customer)  // HTML email with appointment details
sendOrderStatusUpdate(order, customer, newStatus)   // Status change notification email
sendInvoice(invoice, customer)                      // Invoice email with totals
```

### `lib/i18n.ts`

next-intl configuration. Reads locale from `NEXT_LOCALE` cookie. Supported locales: `["en", "ar"]`. Default: `"en"`.

### `lib/utils.ts`

All general-purpose utility functions.

| Function | Description |
|----------|-------------|
| `cn(...classes)` | Merges class names with `clsx` + `tailwind-merge` |
| `formatCurrency(amount, currency?)` | Formats number as `AED 1,234.00`; defaults to AED |
| `formatDate(date)` | Returns `"Today"`, `"Tomorrow"`, `"Yesterday"`, or `"01 Jan 2025"` |
| `formatDateTime(date)` | Returns `"01 Jan 2025, 2:30 PM"` |
| `formatRelativeTime(date)` | Returns `"2 hours ago"`, `"3 days ago"`, etc. |
| `generateOrderNumber()` | Returns `"HOT-[timestamp]-[4-char-random]"` |
| `generateInvoiceNumber()` | Returns `"INV-2025-[timestamp]"` |
| `truncate(str, length)` | Truncates string with ellipsis |
| `getInitials(name)` | `"John Doe"` => `"JD"` |
| `debounce(fn, delay)` | Returns debounced version of `fn` |
| `openWhatsApp(phone, message)` | Opens WhatsApp deep-link in new tab |
| `ORDER_STATUS_CONFIG` | Map of status => `{ label, color, bgColor }` for all 8 order statuses |
| `PRIORITY_CONFIG` | Map of priority => `{ label, color }` |

---

## Components

### UI Primitives — `components/ui/`

Re-exported Shadcn/Radix components with the project's Tailwind theme applied.

| Component | Description |
|-----------|-------------|
| `button.tsx` | Button with variants: `default`, `destructive`, `outline`, `ghost`, `link` |
| `input.tsx` | Styled text input |
| `textarea.tsx` | Multi-line text input |
| `label.tsx` | Accessible form label |
| `card.tsx` | Card container (`Card`, `CardHeader`, `CardContent`, `CardFooter`) |
| `dialog.tsx` | Modal dialog (`Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`) |
| `dropdown-menu.tsx` | Radix dropdown with keyboard nav |
| `select.tsx` | Custom select with search |
| `table.tsx` | Semantic HTML table with styled rows |
| `tabs.tsx` | Tabbed panel (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`) |
| `avatar.tsx` | Circular avatar with fallback initials |
| `badge.tsx` | Inline status/label badge |
| `skeleton.tsx` | Animated loading placeholder |
| `tooltip.tsx` | Hover tooltip via Radix |
| `switch.tsx` | Toggle switch |
| `progress.tsx` | Linear progress bar |
| `scroll-area.tsx` | Custom scrollbar via Radix |
| `separator.tsx` | Horizontal/vertical rule |

### Layout — `components/layout/`

#### `sidebar.tsx`

Collapsible navigation sidebar.

- Reads `sidebarCollapsed` from `useUIStore`
- Width: `240px` expanded / `72px` collapsed
- 14 nav items with Lucide icons: Dashboard, Orders, Customers, Appointments, Measurements, Fabrics, Invoices, Leads, Finance, Follow-ups, Purchases, POS, Notifications, Settings
- Bottom: user avatar, name, role badge, logout button
- Fully responsive; collapses automatically on mobile

#### `topbar.tsx`

Top navigation bar rendered on all dashboard pages.

- Left: sidebar toggle button, page title
- Center: `GlobalSearch` component
- Right: `BranchSelector`, `LanguageToggle`, theme toggle, `NotificationsPanel`, user avatar dropdown

### Dashboard Charts — `components/dashboard/`

| Component | Description |
|-----------|-------------|
| `stat-card.tsx` | KPI card with icon, value, label, and optional trend percentage |
| `revenue-chart.tsx` | Recharts `LineChart` showing daily revenue over the last 30 days |
| `order-status-chart.tsx` | Recharts `PieChart` showing order count per status with colour-coded legend |

### Order Components — `components/orders/`

| Component | Description |
|-----------|-------------|
| `order-form.tsx` | Multi-field form for creating/editing orders. Fields: customer (searchable dropdown), garment type, fabric name/color/quantity, delivery date, trial date, advance amount, total amount, design notes, priority. Uses `react-hook-form` + `orderSchema` (Zod). |
| `order-kanban.tsx` | Drag-and-drop Kanban board. 8 columns (one per `OrderStatus`). Cards show order number, customer name, garment type, delivery date, priority badge. Drag triggers `updateOrderStatus()`. |
| `bespoke-designer.tsx` | Visual garment customization tool. SVG garment outline with clickable zones for collar, cuffs, buttons, lapels. Saves design JSON to order. |
| `order-status-badge.tsx` | Displays coloured badge for any `OrderStatus` value using `ORDER_STATUS_CONFIG`. |

### Customer Components — `components/customers/`

| Component | Description |
|-----------|-------------|
| `customer-form.tsx` | Create/edit form for customers. Fields: name, email, phone, gender, date of birth, address, city, notes, tags, isVIP toggle. Validates with `customerSchema`. |

### Invoice Components — `components/invoices/`

| Component | Description |
|-----------|-------------|
| `invoice-form.tsx` | Invoice creation form. Dynamically adds/removes line items. Calculates subtotal, discount, tax, and total in real-time. Links to an existing order. |
| `invoice-view.tsx` | Printable invoice layout. Renders House of Tailors header, customer info, item table, payment summary. Triggered by "Print" button. |

### Measurement Components — `components/measurements/`

| Component | Description |
|-----------|-------------|
| `measurement-form.tsx` | Records 20+ body measurements for a customer. Fields grouped into sections: Upper Body, Lower Body, Additional. Numeric inputs with unit labels (cm/inch toggle). |

### Appointment Components — `components/appointments/`

| Component | Description |
|-----------|-------------|
| `appointment-form.tsx` | Appointment creation/edit form. Fields: customer, staff, title, type (FITTING/CONSULTATION/DELIVERY/FOLLOW_UP), start time, end time, notes. Validates overlapping slots. |

### Shared Components — `components/shared/`

| Component | Description |
|-----------|-------------|
| `branch-selector.tsx` | Dropdown with all branches (All, Main, Business Bay, JLT, etc.). Updates `?branch=` URL param. All server pages read this param to filter data. |
| `global-search.tsx` | Full-text search bar in topbar. Debounces 400ms, calls `/api/search`. Renders categorised results dropdown (Orders, Customers, Leads). Click navigates to detail. |
| `language-toggle.tsx` | EN/AR language toggle button. Calls `setLocale()` server action. Page reloads with new `NEXT_LOCALE` cookie; layout applies `dir="rtl"` for Arabic. |
| `notifications-panel.tsx` | Bell icon with unread count badge. Opens slide-out panel listing last 10 notifications with type icons, messages, and timestamps. "Mark all read" button calls server action. |

---

## Hooks

### `hooks/use-realtime-notifications.ts`

```typescript
function useRealtimeNotifications(): void
```

Subscribes to Supabase `postgres_changes` on the `notifications` table (`INSERT` events filtered by `user_id`). On new notification: adds to `useNotificationsStore`, shows a toast. Cleans up channel subscription on unmount.

Used once in `DashboardLayoutClient` so it runs for all dashboard pages.

---

## State Stores

All stores use Zustand with `persist` middleware where noted.

### `store/branch-store.ts`

```typescript
useBranchStore() => { activeBranch: string, setActiveBranch: (branch: string) => void }
```

Tracks the currently selected branch. Persisted in `localStorage`. Initial value: `"All"`.

### `store/ui-store.ts`

```typescript
useUIStore() => {
  sidebarCollapsed: boolean,
  theme: "dark" | "light",
  setSidebarCollapsed: (v: boolean) => void,
  toggleSidebar: () => void,
  setTheme: (theme: "dark" | "light") => void,
}
```

Persisted in `localStorage`. Controls sidebar width and colour theme.

### `store/notifications-store.ts`

```typescript
useNotificationsStore() => {
  notifications: Notification[],
  unreadCount: number,
  addNotification: (n: Notification) => void,
  markAllRead: () => void,
  clearNotifications: () => void,
}
```

In-memory store (not persisted). Fed by `useRealtimeNotifications` hook. Capped at 50 entries.

### `store/locale-store.ts`

```typescript
useLocaleStore() => { locale: "en" | "ar", setLocale: (l: "en" | "ar") => void }
```

Persisted in `localStorage`. Mirrors the cookie set by `actions/locale.ts`.

---

## Types

### `types/index.ts`

Single source of truth for all TypeScript types.

#### Enums

| Enum | Values |
|------|--------|
| `UserRole` | `ADMIN`, `MANAGER`, `STAFF` |
| `StaffPosition` | `MASTER_TAILOR`, `TAILOR`, `CUTTER`, `DESIGNER`, `SALES`, `MANAGER`, `RECEPTIONIST` |
| `Gender` | `MALE`, `FEMALE`, `OTHER` |
| `OrderStatus` | `PENDING`, `CONFIRMED`, `FABRIC_SOURCED`, `CUTTING`, `STITCHING`, `FINISHING`, `READY_FOR_DELIVERY`, `DELIVERED` |
| `OrderPriority` | `LOW`, `NORMAL`, `HIGH`, `URGENT` |
| `AppointmentStatus` | `SCHEDULED`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW` |
| `AppointmentType` | `FITTING`, `CONSULTATION`, `DELIVERY`, `FOLLOW_UP` |
| `InvoiceStatus` | `DRAFT`, `SENT`, `PAID`, `OVERDUE`, `CANCELLED` |
| `PaymentMethod` | `CASH`, `CARD`, `UPI`, `BANK_TRANSFER`, `CHEQUE` |
| `FollowUpStatus` | `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `FollowUpPriority` | `LOW`, `MEDIUM`, `HIGH` |
| `NotificationType` | `ORDER_STATUS`, `APPOINTMENT`, `PAYMENT`, `FOLLOWUP`, `SYSTEM`, `DELIVERY` |
| `LeadStatus` | `ENQUIRY`, `QUOTED`, `CLOSED_WON`, `CLOSED_LOST` |

#### Model Types

| Type | Key Fields |
|------|-----------|
| `User` | id, name, email, role, position, isActive, createdAt |
| `Customer` | id, name, email, phone, address, city, gender, dateOfBirth, notes, tags, isVIP, isActive, branch |
| `Order` | id, orderNumber, customerId, status, priority, garmentType, fabricName, fabricColor, fabricQuantity, designNotes, orderDate, deliveryDate, trialDate, advanceAmount, totalAmount, assignedTo, branch |
| `OrderHistory` | id, orderId, status, notes, changedBy, changedAt |
| `Measurement` | id, customerId, chest, waist, hip, shoulder, neck, sleeve, thigh, inseam, ... (20+ fields), takenBy, takenAt |
| `Appointment` | id, customerId, staffId, title, type, startTime, endTime, status, notes, reminderAt |
| `Invoice` | id, invoiceNumber, customerId, orderId, status, subtotal, discountType, discountValue, taxRate, taxAmount, totalAmount, paidAmount, dueAmount, dueDate |
| `InvoiceItem` | id, invoiceId, description, quantity, unitPrice, amount |
| `Payment` | id, invoiceId, amount, method, reference, paidAt |
| `FollowUp` | id, customerId, staffId, title, status, priority, dueDate, completedAt |
| `Fabric` | id, name, color, quantity, reorderLevel, unit, supplier, pricePerUnit |
| `Lead` | id, customerId, enquiryDetails, quotedAmount, status, closedAt |
| `Supplier` | id, name, contact, email, address |
| `Purchase` | id, supplierId, items, totalAmount, status, orderedAt, receivedAt |
| `Notification` | id, userId, type, relatedId, message, read, createdAt |
| `ActivityLog` | id, userId, action, entityType, entityId, createdAt |

#### Utility Types

```typescript
PaginatedResult<T>  // { data: T[], total: number, page: number, limit: number, hasMore: boolean }
ApiResponse<T>      // { success: boolean, data?: T, error?: string }
DashboardStats      // { pendingOrders, totalCustomers, monthlyRevenue, newCustomers }
```

---

## Validators

All schemas use Zod. Exported as named schema + inferred TypeScript type.

### `validators/customer.ts`

- `name`: 2–100 chars (required)
- `email`: valid email (optional)
- `phone`: 7–20 chars (required)
- `gender`: enum (optional)
- `dateOfBirth`, `address`, `city`, `notes`: strings (optional)
- `tags`: string array (optional)
- `isVIP`: boolean, default `false`

### `validators/order.ts`

- `customerId`: required UUID
- `garmentType`, `fabricName`, `fabricColor`: required strings
- `fabricQuantity`: positive number
- `deliveryDate`: ISO date string, must be in the future
- `trialDate`: optional date
- `advanceAmount`, `totalAmount`: positive numbers (advanceAmount <= totalAmount)
- `priority`: enum
- `designNotes`, `assignedTo`: optional

### `validators/appointment.ts`

- `customerId`, `staffId`: required UUIDs
- `title`: required string
- `type`: enum (FITTING/CONSULTATION/DELIVERY/FOLLOW_UP)
- `startTime`, `endTime`: ISO datetime; endTime must be after startTime
- `notes`: optional

### `validators/invoice.ts`

- `customerId`: required UUID
- `orderId`: optional UUID
- `items`: array of `{ description, quantity > 0, unitPrice > 0 }`
- `discountType`: PERCENTAGE or FIXED (optional)
- `discountValue`: non-negative number
- `taxRate`: 0–100
- `dueDate`: required date

### `validators/measurement.ts`

20+ optional numeric fields (all must be positive when provided): `chest`, `waist`, `hip`, `shoulder`, `neck`, `sleeve`, `thigh`, `knee`, `ankle`, `inseam`, `rise`, `wrist`, `bicep`, `forearm`, `backLength`, `frontLength`, `shoulderToWaist`, `waistToKnee`, `waistToAnkle`.

### `validators/fabric.ts`

- `name`, `color`: required strings
- `quantity`, `reorderLevel`, `pricePerUnit`: positive numbers
- `unit`: METER / YARD / PIECE
- `supplier`: optional string

### `validators/followup.ts`

- `customerId`, `title`: required
- `status`: enum
- `priority`: enum
- `dueDate`: future date
- `notes`: optional

### `validators/lead.ts`

- `customerId`: required UUID
- `enquiryDetails`: min 10 chars
- `quotedAmount`: positive number
- `status`: enum

---

## Config Files

### `next.config.ts`

- Wraps with `withSentryConfig` for error tracking + source map upload
- Wraps with `createNextIntlPlugin` for EN/AR i18n
- `serverActions.allowedOrigins`: `["localhost:3000"]`
- Sentry: `silent: true` in non-CI, `disableLogger: true`

### `tailwind.config.ts`

Custom design system on top of Tailwind CSS 4.

**Gold luxury palette:**
- `gold.DEFAULT` — `#D4AF37`
- `gold.light` — `#F0D060`
- `gold.dark` — `#B8960C`
- `gold.muted` — `#8B7536`

**Dark surface palette:**
- `luxury.bg` — `#0A0A0A`
- `luxury.surface` — `#111111`
- `luxury.card` — `#1A1A1A`
- `luxury.border` — `#2A2A2A`

**Custom animations:** `shimmer`, `fade-in`, `slide-in-right`, `gold-pulse`, `accordion-down`, `accordion-up`

**Custom gradients:** `gold-gradient`, `dark-gradient`, `card-gradient`

### `tsconfig.json`

- `target: "ES2017"` — broad browser compatibility
- `strict: true` — all strict checks enabled
- `paths: { "@/*": ["./*"] }` — root-relative imports everywhere

### `middleware.ts`

Exported from NextAuth `auth`. Intercepts all requests.

- Public routes: `/login`, `/signup`, `/api/auth/**`, `/_next/**`, `/public/**`, `HT_White.png`
- All other routes require a valid session; unauthenticated requests redirect to `/login`

### `vitest.config.ts`

- Environment: `jsdom`
- Global test APIs enabled (no explicit import needed)
- Setup file: `tests/setup.ts`
- Alias `@/*` mirrors tsconfig path

### `package.json` — Key Dependencies

| Package | Purpose |
|---------|---------|
| `next` | Framework |
| `react` | UI runtime |
| `@supabase/supabase-js` | Database + Realtime |
| `next-auth` (v5 beta) | Authentication |
| `zustand` | Global state |
| `react-hook-form` | Form management |
| `zod` | Validation |
| `@hello-pangea/dnd` | Drag-and-drop for Kanban |
| `recharts` | Charts |
| `next-intl` | i18n (EN/AR) |
| `resend` | Transactional email |
| `openai` | AI assistant |
| `bcryptjs` | Password hashing |
| `@sentry/nextjs` | Error monitoring |
| `tailwindcss` | Styling |
| `vitest` | Testing |

---

## Database Schema

Tables live in Supabase-managed PostgreSQL. No ORM — queries use the Supabase JS client directly.

```
User
  id uuid PK
  name text
  email text UNIQUE
  password text (bcrypt hash)
  role UserRole
  position StaffPosition
  isActive boolean DEFAULT true
  createdAt timestamp

Customer
  id uuid PK
  name, email, phone, address, city text
  gender Gender
  dateOfBirth date
  notes text
  tags text[]
  isVIP boolean
  isActive boolean
  branch text
  createdAt timestamp

Order
  id uuid PK
  orderNumber text UNIQUE       -- "HOT-[ts]-[rand]"
  customerId uuid FK Customer
  status OrderStatus
  priority OrderPriority
  garmentType text
  fabricName, fabricColor text
  fabricQuantity numeric
  designNotes text
  designImages text[]
  orderDate timestamp
  deliveryDate date
  trialDate date
  advanceAmount, totalAmount numeric
  assignedTo uuid FK User
  branch text
  isActive boolean

OrderHistory
  id uuid PK
  orderId uuid FK Order
  status OrderStatus
  notes text
  changedBy uuid FK User
  changedAt timestamp

Measurement
  id uuid PK
  customerId uuid FK Customer
  chest, waist, hip, shoulder, neck, sleeve,
  thigh, knee, ankle, inseam, rise,
  wrist, bicep, forearm,
  backLength, frontLength,
  shoulderToWaist, waistToKnee, waistToAnkle numeric
  unit text DEFAULT 'cm'
  takenBy uuid FK User
  takenAt timestamp

Appointment
  id uuid PK
  customerId uuid FK Customer
  staffId uuid FK User
  title text
  type AppointmentType
  startTime, endTime timestamp
  status AppointmentStatus
  notes text
  reminderAt timestamp

Invoice
  id uuid PK
  invoiceNumber text UNIQUE     -- "INV-2025-[ts]"
  customerId uuid FK Customer
  orderId uuid FK Order
  status InvoiceStatus
  subtotal, discountValue, taxRate, taxAmount numeric
  discountType text
  totalAmount, paidAmount, dueAmount numeric
  dueDate date

InvoiceItem
  id uuid PK
  invoiceId uuid FK Invoice
  description text
  quantity, unitPrice, amount numeric

Payment
  id uuid PK
  invoiceId uuid FK Invoice
  amount numeric
  method PaymentMethod
  reference text
  paidAt timestamp

FollowUp
  id uuid PK
  customerId uuid FK Customer
  staffId uuid FK User
  title text
  status FollowUpStatus
  priority FollowUpPriority
  dueDate date
  completedAt timestamp

Fabric
  id uuid PK
  name, color text
  quantity, reorderLevel, pricePerUnit numeric
  unit text
  supplier text

Lead
  id uuid PK
  customerId uuid FK Customer
  enquiryDetails text
  quotedAmount numeric
  status LeadStatus
  closedAt timestamp

Supplier
  id uuid PK
  name, contact, email, address text

Purchase
  id uuid PK
  supplierId uuid FK Supplier
  items jsonb
  totalAmount numeric
  status text
  orderedAt, receivedAt timestamp

Notification
  id uuid PK
  userId uuid FK User
  type NotificationType
  relatedId uuid
  message text
  read boolean DEFAULT false
  createdAt timestamp

ActivityLog
  id uuid PK
  userId uuid FK User
  action, entityType text
  entityId uuid
  createdAt timestamp
```

---

## Key Workflows

### Authentication

1. User submits email + password on `/login`
2. NextAuth `CredentialsProvider` calls `bcrypt.compare(password, hash)`
3. On success: JWT created with `{ id, email, name, role }`
4. Session stored in browser cookie
5. Middleware (`auth()`) validates JWT on every request
6. Unauthenticated requests redirected to `/login`

### Create Order

1. User opens order modal on `/orders`
2. Selects customer (calls `searchCustomers()` as they type)
3. Fills garment type, fabric details, dates, amounts
4. Submit calls `createOrder()` server action
5. `generateOrderNumber()` produces unique `HOT-...` number
6. Supabase `INSERT` into `Order` table
7. Initial `OrderHistory` entry created (`PENDING` status)
8. `revalidatePath("/orders")` refreshes server cache
9. Order appears in Kanban at PENDING column

### Update Order Status (Kanban Drag)

1. User drags order card to new column
2. `updateOrderStatus(id, newStatus)` called
3. `Order.status` updated in Supabase
4. New `OrderHistory` row inserted with timestamp and notes
5. If email configured: `sendOrderStatusUpdate()` fires via Resend
6. Page revalidated; Kanban re-renders with card in new column

### Real-Time Notifications

1. `useRealtimeNotifications()` hook mounts in `DashboardLayoutClient`
2. Opens Supabase channel: `postgres_changes` on `notifications` table (INSERT, filtered by `user_id`)
3. Any INSERT triggers callback — calls `addNotification()` on store
4. Toast notification appears bottom-right
5. Bell icon badge count increments
6. Notifications panel lists all received items

### Record Payment

1. User opens invoice detail page, clicks "Record Payment"
2. Fills amount + payment method
3. `recordPayment(invoiceId, data)` server action runs
4. `Payment` row inserted
5. `Invoice.paidAmount` incremented, `dueAmount` recalculated
6. If `dueAmount <= 0`: `Invoice.status` set to `PAID`
7. Path revalidated; invoice page shows updated amounts

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in all values before running locally.

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# OpenAI (AI Assistant)
OPENAI_API_KEY=

# Resend (Email)
RESEND_API_KEY=

# Sentry (Error monitoring)
SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

---

## Development

```bash
# Install dependencies
npm install

# Start dev server (Turbopack)
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Start production server
npm start
```

Server runs at `http://localhost:3000`.
