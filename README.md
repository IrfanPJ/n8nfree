# House of Tailors CRM

Enterprise-grade CRM for luxury tailoring businesses. Manages customers, orders, measurements, appointments, invoices, fabric inventory, and multi-branch operations.

**Live:** https://htcrm.vercel.app

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.6 (App Router, Turbopack) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4, Shadcn UI, Radix UI |
| Auth | NextAuth v5 beta (credential + session) |
| Database | Supabase (PostgreSQL + Row Level Security) |
| State | Zustand 5 |
| Email | Resend |
| Monitoring | Sentry |
| i18n | next-intl 4 (English + Arabic RTL) |
| Testing | Vitest 4 |
| Deployment | Vercel |

---

## Features

- **Customer Management** — full CRM with VIP status, tags, measurements, order history
- **Order Management** — 8-stage pipeline (PENDING → DELIVERED), priority levels, fabric tracking, cursor-based pagination
- **Measurements** — 20+ body measurements per customer
- **Appointments** — calendar scheduling with email confirmation (Resend)
- **Invoicing** — multi-item invoices, discounts, tax, payment tracking
- **Fabric Inventory** — stock levels, reorder alerts, supplier links
- **Lead Pipeline** — ENQUIRY → QUOTED → CLOSED_WON / CLOSED_LOST
- **Finance Dashboard** — revenue charts, payment summaries (Recharts)
- **POS** — point-of-sale for walk-in retail
- **AI Assistant** — OpenAI-powered workflow automation
- **Real-Time Notifications** — Supabase Realtime (postgres_changes)
- **Multi-Branch** — URL-param branch filter across all pages
- **Multi-Language** — EN / AR with automatic RTL layout
- **Roles** — ADMIN, MANAGER, TAILOR, STAFF with per-table RLS policies
- **Offline Support** — Service Worker (Cache First for static, Network First for pages)
- **Error Monitoring** — Sentry with source map upload

---

## Project Structure

```
htcrm/
├── app/
│   ├── (auth)/           # login, signup
│   ├── (dashboard)/      # all protected pages
│   └── api/              # route handlers (auth, notifications, search, AI)
├── actions/              # server actions (customers, orders, invoices, …)
├── components/
│   ├── shared/           # branch-selector, global-search, notifications-panel
│   └── ui/               # Shadcn primitives
├── hooks/                # use-realtime-notifications, etc.
├── lib/                  # supabase, auth, email, i18n, RLS helpers
├── messages/             # en.json, ar.json
├── public/sw.js          # service worker
├── store/                # Zustand: branch, locale, notifications, ui
├── tests/                # Vitest integration tests
├── types/index.ts        # all model types & enums
└── validators/           # Zod schemas
```

---

## Database

Managed directly in Supabase (no Prisma). Core tables:

`User` · `Customer` · `Order` · `OrderHistory` · `Measurement` · `Appointment` · `Invoice` · `InvoiceItem` · `Payment` · `FollowUp` · `Fabric` · `Lead` · `Supplier` · `Purchase` · `Notification` · `ActivityLog`

Row Level Security is enabled on all tables. Because the app uses NextAuth (not Supabase Auth), RLS policies read from application-set session config:

```sql
SELECT current_setting('app.user_id',   true);
SELECT current_setting('app.user_role', true);
```

Run `supabase-rls-policies.sql` in the Supabase SQL editor after the main migration.

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=          # Settings → API → service_role key
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Settings → API → anon public key

# NextAuth
NEXTAUTH_SECRET=                    # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Transactional email (optional — emails silently no-op if unset)
RESEND_API_KEY=re_...

# Error monitoring (optional — Sentry disabled if unset)
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=house-of-tailors-crm
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
# → http://localhost:3000

# Run tests
npm test

# Production build (local check)
npm run build
```

---

## Deployment

The app is deployed to Vercel and auto-deploys on push to `master`.

To deploy manually:

```bash
npx vercel --prod
```

Sentry source maps upload automatically when `SENTRY_AUTH_TOKEN` is set in Vercel environment variables.

---

## RLS Setup (Supabase)

After creating your Supabase project and running the initial schema:

1. Open the Supabase **SQL Editor**
2. Paste and run `supabase-rls-policies.sql`

This creates the `set_rls_claims()`, `current_user_id()`, and `current_user_role()` functions and enables per-table policies.

---

## Branch Filtering

The active branch is stored as a URL search param (`?branch=Madinah`). The `BranchSelector` component in the sidebar updates this param; all server components read it from `searchParams` and pass it to the relevant server action.

---

## i18n

Translations live in `messages/en.json` and `messages/ar.json`. The active locale is stored in a `locale` cookie (set via `actions/locale.ts`). Arabic enables RTL via `dir="rtl"` on `<html>`.

---

## Testing

```bash
npm test          # run all tests once
npm run test:watch  # watch mode
```

Integration tests in `tests/actions/` use a thenable chainable Supabase mock (see `tests/helpers/supabase-mock.ts`). All tests run in Node environment via Vitest.
