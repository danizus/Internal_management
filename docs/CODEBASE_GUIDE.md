# TAM VPS Reseller & Management Platform — Codebase Guide

This document preserves architectural context, coding conventions, schema designs, and implemented features for AI coding agents and human developers.

---

## 1. System Overview & Architecture Rules

This application is a specialized **VPS Reseller Catalog, Order Fulfillment, and Margin Management Platform** integrated with **WHMCS**.

### Strict Architectural Principles (from `AGENTS.md`)
1. **API Layers**:
   ```
   routes (HTTP + Zod 4 validation)
     └─> services (business rules, error normalization, transaction orchestration)
           └─> db (plain SQL via pg, parameterized only with $1, $2, etc.)
   ```
   - **No ORM** (no Prisma, Drizzle, TypeORM).
   - **No extra abstractions** or unnecessary layers.
2. **Identifiers & Money**:
   - All IDs are PostgreSQL `BIGINT` (`GENERATED ALWAYS AS IDENTITY`).
   - IDs are serialized as **strings in JSON** (e.g. `"42"`).
   - All money is stored in **minor units** (e.g. cents, `$12.50` = `1250`) as `BIGINT`.
   - Money is accompanied by an ISO-4217 uppercase 3-letter currency code (e.g. `"USD"`, `"EUR"`).
   - All calculations use integer BigInt arithmetic (never JavaScript floating point).
3. **Database Migrations**:
   - Plain numbered SQL files in `db/migrations/` (e.g. `001_initial_schema.sql`).
   - Run manually by the user: agents never execute migrations or alter live production tables directly.
4. **Mobile-First UI**:
   - Compact stacked card views on screens `< md` (with bottom tab bar).
   - Data-dense comparative tables on screens `>= md` (with side navigation).
   - Safe padding (`pb-20 md:pb-8`) so mobile bottom navigation never obscures content or action buttons.
5. **Zero Unapproved Dependencies**:
   - No dependencies added without explicitly stating name, version, and rationale to the user.
   - Built-in Node 22 APIs (`node:crypto`, `node:child_process`, `fetch`) are preferred over external npm packages.

---

## 2. Monorepo Structure

```
tam/
├── .env                  # Environment secrets & database URL
├── .env.example          # Environment blueprint
├── AGENTS.md             # Core architecture directives
├── package.json          # Root npm workspaces config & unified commands
├── tsconfig.json         # Root TypeScript config
├── scripts/
│   └── dev.mjs           # Dependency-free cross-platform child process runner
├── docs/
│   ├── schema.dbml       # Canonical DBML database schema
│   ├── CODEBASE_GUIDE.md # (This file) Deep system & architectural context
│   └── API_REFERENCE.md  # Detailed API endpoint & payload reference
├── db/
│   └── migrations/
│       └── 001_initial_schema.sql  # 12 core tables, indexes & constraints
├── apps/
│   ├── api/              # Express 5 REST API (Port 4000)
│   │   ├── src/
│   │   │   ├── index.ts              # Entrypoint with graceful DB ping
│   │   │   ├── app.ts                # Express app configuration & middleware pipeline
│   │   │   ├── config/env.ts         # Zod-validated environment config
│   │   │   ├── db/
│   │   │   │   ├── pool.ts           # pg.Pool & parameterized withTransaction() helper
│   │   │   │   ├── countries.db.ts   # Parameterized SQL for countries
│   │   │   │   ├── vendors.db.ts     # Parameterized SQL for vendors & wholesale packages
│   │   │   │   ├── displayPackages.db.ts # Parameterized SQL for retail packages
│   │   │   │   ├── clients.db.ts     # Parameterized SQL for clients
│   │   │   │   ├── purchases.db.ts   # Parameterized SQL for purchases
│   │   │   │   └── users.db.ts       # Parameterized SQL for users & auth
│   │   │   ├── middleware/
│   │   │   │   ├── errorHandler.ts   # HttpError & Zod validation error formatter
│   │   │   │   ├── requestLogger.ts  # Request logging middleware
│   │   │   │   ├── rateLimiter.ts    # 100 req/15min rate limiter with X-RateLimit headers
│   │   │   │   └── auth.ts           # requireAuth & requireRole("admin") middlewares
│   │   │   ├── routes/
│   │   │   │   ├── health.ts         # GET /api/health with DB connectivity & latency
│   │   │   │   ├── auth.ts           # POST /api/auth/register, login, GET me
│   │   │   │   ├── countries.ts      # CRUD /api/countries
│   │   │   │   ├── vendors.ts        # CRUD /api/vendors & /api/vendor-packages
│   │   │   │   ├── displayPackages.ts # CRUD /api/display-packages
│   │   │   │   ├── clients.ts        # CRUD /api/clients
│   │   │   │   └── purchases.ts      # CRUD /api/purchases & /api/purchases/:id/fulfill
│   │   │   ├── schemas/
│   │   │   │   └── common.ts         # bigintIdSchema, minorUnit schemas, calculateProfitMinor
│   │   │   ├── services/
│   │   │   │   ├── auth.crypto.ts    # scrypt password hashing & HMAC-SHA256 session tokens
│   │   │   │   ├── auth.service.ts   # Registration (first user is admin), login logic
│   │   │   │   ├── countries.service.ts
│   │   │   │   ├── vendors.service.ts
│   │   │   │   ├── displayPackages.service.ts # Live margin calculation
│   │   │   │   ├── clients.service.ts
│   │   │   │   └── purchases.service.ts # Order fulfillment & transactional counters
│   │   │   └── __tests__/            # Vitest unit & integration test suites (10 test files)
│   └── web/              # Next.js 16 Webpack App Router (Port 3000)
│       ├── app/
│       │   ├── layout.tsx            # AppShell wrapper
│       │   ├── page.tsx              # Home redirection
│       │   ├── dashboard/page.tsx    # Executive KPIs & metrics
│       │   ├── vendors/page.tsx      # Directory: Wholesale Plans, Vendors, Countries
│       │   ├── packages/page.tsx     # Retail catalog, WHMCS PID mapping & margin calculator
│       │   ├── purchases/page.tsx    # Orders queue, fulfillment modal, net profit tracking
│       │   └── clients/page.tsx      # Client CRM directory & WHMCS client mapping
│       ├── components/
│       │   └── app-shell.tsx         # Mobile bottom bar + Desktop sidebar navigation
│       └── lib/
│           └── money.ts              # formatMinorToMoney, parseMajorToMinor (no float math)
```

---

## 3. Implemented Phases (1 through 4)

### Phase 1: Database Foundation & Shared Utilities
- Created `001_initial_schema.sql` with all 12 tables, indexes, check constraints, and foreign keys.
- Established `apps/api/src/db/pool.ts` using `pg.Pool` and `withTransaction<T>(callback)`.
- Implemented `common.ts` schemas:
  - `bigintIdSchema`: Validates positive bigint string format.
  - `nonNegativeMinorAmountSchema` / `positiveMinorAmountSchema`: BigInt minor units.
  - `currencyCodeSchema`: 3-letter ISO code uppercase.
  - `calculateProfitMinor(sales, purchase, charges)`: Precise BigInt math.

### Phase 2: Countries & Reseller Directory
- `countries`: Country name & ISO code lookup.
- `vendors`: Upstream VPS providers with rating (`0.00-5.00`), website, sales counter, notes.
- `vendor_packages`: Wholesale VPS plans with CPU, RAM, storage, OS, bandwidth, IP, wholesale price, and sales counter.
- Full parameterized query filters on wholesale directory (`vendor_id`, `country_id`, `operating_system`, `max_price_minor`, `q`).

### Phase 3: Retail Catalog & Margin Calculator
- `display_packages`: Packages sold on WHMCS mapped to `whmcs_pid` and default upstream plan `default_vendor_package_id`.
- Automatically computes `estimated_margin_minor` (`price_minor - upstream_price_minor`) when currencies match.
- Web UI includes live gross margin calculation while typing and one-click spec copying from wholesale plans.

### Phase 4: Clients, Purchases & Order Fulfillment Lifecycle
- `clients`: Customer CRM storing `whmcs_client_id`, contact details, status, and active purchase count.
- `purchases`: Tracks order lifecycle:
  - Statuses: `'pending_fulfillment'`, `'active'`, `'suspended'`, `'cancelled'`, `'refunded'`.
  - Links WHMCS External IDs: `whmcs_order_id`, `whmcs_service_id`, `whmcs_invoice_id`.
  - Enforces `profit_amount_minor = sales_amount_minor - purchase_amount_minor - processing_charges_minor`.
  - `fulfillPurchaseService`: Transactionally marks order `'active'`, assigns upstream plan, records provisioned IP/hostname, and increments `vendors.vendor_sales_count` and `vendor_packages.package_sales_count`.
- Web UI includes an Orders Queue with status filter pills (`All`, `Pending`, `Active`, `Due Soon`, `Suspended/Cancelled`) and a 1-click **Fulfill Order** modal.

### Phase 5: WHMCS Integration (Webhook Receiver + API Pull + PHP Hook Script)
- **Ready-to-Drop Action Hook**:
  - `docs/whmcs-hook/tam_order_sync.php`: Hooks into `OrderPaid`, `AcceptOrder`, and `ServiceEdit`, generating signed HMAC-SHA256 payloads.
- **Webhook Receiver**:
  - `POST /api/webhooks/whmcs`: Verifies `X-WHMCS-Signature` header, parses major currency to minor units, auto-upserts `clients` by `whmcs_client_id`, matches `display_packages` by `whmcs_pid`, and creates/updates `purchases` as `'pending_fulfillment'` so staff can fulfill them.
- **Reconciliation Pull**:
  - `POST /api/whmcs/sync`: Calls WHMCS External API (`GetOrders`, `GetClientsDetails`) to backfill past orders.
  - `GET /api/whmcs/status`: Inspects environment configuration readiness.
  - `GET /api/whmcs/logs`: Audit trail for all inbound webhooks and sync runs (`whmcs_sync_logs`).
- **Web UI**:
  - Added **WHMCS Sync** (`/whmcs`) to navigation with connection status cards, a 1-click sync trigger, and an interactive audit log viewer with JSON payload inspection.

### Additional Infrastructure Added
- **Database Connectivity Indicator**:
  - Graceful startup check (`SELECT 1`): logs success or warning without crashing.
  - `GET /api/health`: Returns detailed DB connection state and query latency in milliseconds (503 if down).
- **Internal Authentication Module**:
  - `scrypt` hashing with 16-byte random salt and timing-safe verification.
  - HMAC-SHA256 signed session tokens (7-day validity).
  - First registered user is automatically promoted to `admin`.
  - Role-based authorization middleware (`requireAuth`, `requireRole`).
- **Rate Limiter Middleware**:
  - Global `100 requests / 15 minutes` on `/api`.
  - Strict `15 requests / 15 minutes` on `/api/auth/login`.
- **Cross-Platform Script Runner**:
  - `scripts/dev.mjs`: Starts both servers concurrently on Windows/Linux/macOS without shell pipe errors.
  - Individual scripts: `npm run dev:api` and `npm run dev:web`.

---

## 4. How to Run & Test

```powershell
# Run both servers concurrently:
npm run dev

# Run backend API only (Port 4000):
npm run dev:api

# Run frontend Web only (Port 3000):
npm run dev:web

# Run full test suite:
npm run test

# Run typechecker & linter:
npm run typecheck
npm run lint
```
