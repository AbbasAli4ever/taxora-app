# FinanX Mobile App — Master Screen Index

**Status:** Specification (Phase 4, Week 19 — Days 101–105 of 120-day roadmap)
**Stack:** React Native (iOS + Android, day-one)
**Backend Base:** `https://<api-host>/api/v1`
**Auth (v1):** JWT login (existing `/auth/login`); migrate to OAuth PKCE in Week 18 follow-up
**Offline Mode:** Online-only with cached reads (no mutation queue in v1)

---

## 1. Purpose of This Document

This is the **catalog of every screen** the FinanX mobile app will contain. It is the design-first artifact: before any React Native code is written, the team agrees here on **what screens exist, what each screen does, which backend module it talks to, and how screens connect**.

Each row in the screen catalog has a follow-up **per-screen integration MD** in [`/documentation/mobile/`](./mobile/) that specifies components, navigation params, exact endpoints/payloads, error states, and acceptance criteria.

This index is the **single source of truth** for mobile scope. If a screen is not listed here, it is out of scope until added here.

---

## 2. Scope — What's IN, What's OUT

### IN (mobile-native workflows)

| Area | Why mobile |
|------|-----------|
| Dashboard | Glance at cashflow, AR, top stats while away from desk |
| Invoices | Create + send + collect on the road |
| Estimates | Quote on-site, convert to invoice instantly |
| Bills | Approve + mark paid from anywhere |
| Expenses + Receipt Scan | Camera-first capture is the killer mobile feature |
| Customers / Vendors | Quick lookup + add during meetings |
| Products | Lookup + stock card view (read-mostly) |
| Approvals queue | Approvers live in their inbox/phone |
| Time Tracking | Timer is naturally mobile (field/site work) |
| Projects | Status + profitability snapshot |
| Banking | Read-only feed; reconcile happens on desktop |
| Reports (read-only) | P&L, BS, AR Aging, Cash Flow, Sales-by-Customer |
| Notifications | Push inbox, settings |
| Profile / Company switcher / Settings | Required plumbing |

### OUT (web-only — explicitly not in mobile)

- Chart of Accounts editing
- Journal Entry compose
- Custom Report Builder (Week 20)
- Payroll runs
- Tax registers, e-invoicing config, compliance settings
- Bulk import / Data I/O
- Webhook config, OAuth app management, API keys
- RBAC editor (role/permission management)
- Recurring transaction *template editing* (mobile views/pauses only)
- Fixed Assets register CRUD (mobile views read-only optionally — TBD post-v1)
- Multi-entity consolidation
- Warehouse master data, three-way matching workflows

If a user needs an OUT screen, the mobile app shows a friendly "Open on web" CTA with a deep link to the web app.

---

## 3. Information Architecture

### Bottom Tab Bar (5 tabs)

```
[ Home ] [ Sales ] [ Expenses ] [ Approvals ] [ More ]
```

- **Home** — Dashboard, quick-stats, recent activity, notifications icon (badge)
- **Sales** — Invoices, Estimates, Customers (segmented)
- **Expenses** — Expenses, Bills, Vendors (segmented), camera FAB for receipt scan
- **Approvals** — Queue of pending approvals (badge with count)
- **More** — Time Tracking, Projects, Banking, Reports, Products, Notifications, Profile, Company Switcher, Settings, Logout

A persistent **floating action button (FAB)** on Home/Sales/Expenses opens a quick-create sheet:
- New Invoice
- New Estimate
- New Expense
- Scan Receipt
- New Time Entry
- Start Timer

### Stack Hierarchy

```
RootNavigator (auth-gated)
├── AuthStack (unauthenticated)
│   ├── Splash
│   ├── Login
│   ├── ForgotPassword
│   ├── ResetPassword
│   └── MFAChallenge
├── CompanySelect (post-login if user has multiple companies)
└── AppTabs (authenticated)
    ├── HomeStack
    ├── SalesStack
    ├── ExpensesStack
    ├── ApprovalsStack
    └── MoreStack
```

Each `*Stack` is a stack navigator that holds its list, detail, create/edit, and modal screens.

### Deep Links

```
finanx://invoice/:id
finanx://estimate/:id
finanx://bill/:id
finanx://expense/:id
finanx://approval/:type/:id
finanx://customer/:id
finanx://vendor/:id
finanx://project/:id
finanx://notification/:id
```

Push notifications carry a deep link payload that opens the relevant detail screen.

---

## 4. Screen Catalog

Legend:
- **Module** — backend module under `src/modules/`
- **Endpoints** — primary API endpoints (not exhaustive; see per-screen MD)
- **Perm** — required permission key
- **Cache** — Y if read-cached for offline reopen; N if always live
- **Push** — Y if a push notification can deep-link here

### 4.1 Auth & Onboarding (6 screens)

| # | Screen | Route key | Purpose | Module | Endpoints | Perm | Cache | Push |
|---|--------|-----------|---------|--------|-----------|------|-------|------|
| 1 | Splash | `Splash` | Boot, hydrate token, route to login or app | auth | — | — | N | N |
| 2 | Login | `Login` | Email + password → JWT | auth | `POST /auth/login` | — | N | N |
| 3 | Forgot Password | `ForgotPassword` | Email reset request | auth | `POST /auth/forgot-password` | — | N | N |
| 4 | Reset Password | `ResetPassword` | Token-gated new password | auth | `GET /auth/validate-reset-token`, `POST /auth/reset-password` | — | N | N |
| 5 | MFA Challenge | `MFAChallenge` | TOTP code entry (if enabled) | auth | `POST /auth/login` (with code) | — | N | N |
| 6 | Company Switcher | `CompanySelect` | Pick active company post-login | auth | `GET /auth/my-companies`, `POST /auth/switch-company` | — | Y | N |

**Per-screen MD batch:** `mobile/MOBILE_AUTH_*.md`

---

### 4.2 Home / Dashboard (3 screens)

| # | Screen | Route key | Purpose | Module | Endpoints | Perm | Cache | Push |
|---|--------|-----------|---------|--------|-----------|------|-------|------|
| 7 | Home Dashboard | `Home` | KPI cards, cash flow mini-chart, recent activity | dashboard | `GET /dashboard/financial-overview`, `/recent-activity`, `/cash-flow-overview`. **Day 101 TBD:** `GET /mobile/dashboard` (single-call optimization) | `dashboard:view` | Y | N |
| 8 | Quick Stats | `QuickStats` | Drill into a KPI tile (e.g. unpaid invoices) | dashboard | `GET /dashboard/invoice-analytics`, `/top-customers`, etc. | `dashboard:view` | Y | N |
| 9 | Recent Activity Feed | `ActivityFeed` | Full list of recent system activity | dashboard / audit-trail | `GET /dashboard/recent-activity`, `GET /audit-trail` | `audit:view` | Y | N |

---

### 4.3 Sales — Invoices (6 screens)

| # | Screen | Route key | Purpose | Module | Endpoints | Perm | Cache | Push |
|---|--------|-----------|---------|--------|-----------|------|-------|------|
| 10 | Invoice List | `InvoiceList` | Search, filter, paginate invoices | invoices | `GET /invoices`, `GET /invoices/summary`, `GET /invoices/statuses` | `invoice:view` | Y | Y (overdue) |
| 11 | Invoice Filter Sheet | `InvoiceFilter` | Status, date range, customer, amount filters | invoices | (client-side params) | `invoice:view` | N | N |
| 12 | Invoice Detail | `InvoiceDetail` | Full invoice + line items + payment history + share/PDF | invoices | `GET /invoices/:id`, `GET /invoices/:id/pdf` | `invoice:view` | Y | Y |
| 13 | Invoice Create / Edit | `InvoiceForm` | Create or edit invoice with line items | invoices | `GET /invoices/next-number`, `POST /invoices`, `PATCH /invoices/:id`, `GET /customers`, `GET /products`, `GET /taxes` | `invoice:create` / `invoice:edit` | N | N |
| 14 | Send Invoice Sheet | `InvoiceSend` | Confirm recipients, message, send | invoices, email | `POST /invoices/:id/send` | `invoice:send` | N | N |
| 15 | Record Payment | `InvoicePayment` | Mark payment received (cash/check/transfer) | invoices | `POST /invoices/:id/payments` | `payment:create` | N | N |

---

### 4.4 Sales — Estimates (4 screens)

| # | Screen | Route key | Purpose | Module | Endpoints | Perm | Cache | Push |
|---|--------|-----------|---------|--------|-----------|------|-------|------|
| 16 | Estimate List | `EstimateList` | Search/filter quotes | estimates | `GET /estimates`, `/summary`, `/statuses` | `estimate:view` | Y | N |
| 17 | Estimate Detail | `EstimateDetail` | Quote view + accept/reject/convert actions | estimates | `GET /estimates/:id`, `POST /estimates/:id/send`, `/accept`, `/reject` | `estimate:view` | Y | Y (accepted) |
| 18 | Estimate Create / Edit | `EstimateForm` | Build a quote | estimates | `POST /estimates`, `PATCH /estimates/:id` | `estimate:create` | N | N |
| 19 | Convert to Invoice | `EstimateConvert` | Confirm + create invoice from estimate | estimates → invoices | `POST /estimates/:id/convert-to-invoice` | `invoice:create` | N | N |

---

### 4.5 Sales — Customers (3 screens)

| # | Screen | Route key | Purpose | Module | Endpoints | Perm | Cache | Push |
|---|--------|-----------|---------|--------|-----------|------|-------|------|
| 20 | Customer List | `CustomerList` | Search customers | customers | `GET /customers` | `customer:view` | Y | N |
| 21 | Customer Detail | `CustomerDetail` | Profile + AR balance + recent invoices + activity | customers | `GET /customers/:id`, `GET /invoices?customerId=`, `GET /reports/ar-aging?customerId=` | `customer:view` | Y | N |
| 22 | Customer Quick-Add | `CustomerForm` | Inline create from invoice flow | customers | `POST /customers` | `customer:create` | N | N |

---

### 4.6 Expenses — Expenses & Receipt Scan (6 screens) ★ flagship

| # | Screen | Route key | Purpose | Module | Endpoints | Perm | Cache | Push |
|---|--------|-----------|---------|--------|-----------|------|-------|------|
| 23 | Expense List | `ExpenseList` | All expenses with status | expenses | `GET /expenses`, `/summary` | `expense:view` | Y | N |
| 24 | Expense Detail | `ExpenseDetail` | Full expense + receipt image + JE link | expenses | `GET /expenses/:id` | `expense:view` | Y | N |
| 25 | Expense Create / Edit | `ExpenseForm` | Manual expense with line items | expenses | `POST /expenses`, `PATCH /expenses/:id`, `GET /vendors`, `GET /accounts`, `GET /categories` | `expense:create` / `expense:edit` | N | N |
| 26 | **Receipt Scan Camera** | `ReceiptCamera` | Capture image from camera or photo library | expenses (mobile) | **TBD Day 102:** `POST /mobile/receipts/scan` (multipart). Falls back to `POST /expenses` with attachment | `expense:create` | N | N |
| 27 | **Receipt OCR Confirm** | `ReceiptConfirm` | Review extracted vendor/date/amount/tax → save | expenses (mobile) | `POST /mobile/receipts/scan` returns prefilled draft → `POST /expenses` | `expense:create` | N | N |
| 28 | Category Picker | `CategoryPicker` | Modal account/category selector | accounts, categories | `GET /accounts?type=Expenses`, `GET /categories` | `category:view` | Y | N |

---

### 4.7 Expenses — Bills (5 screens)

| # | Screen | Route key | Purpose | Module | Endpoints | Perm | Cache | Push |
|---|--------|-----------|---------|--------|-----------|------|-------|------|
| 29 | Bill List | `BillList` | Vendor bills with status | bills | `GET /bills`, `/summary`, `/statuses` | `bill:view` | Y | Y (overdue) |
| 30 | Bill Detail | `BillDetail` | Full bill + line items + payment history | bills | `GET /bills/:id` | `bill:view` | Y | Y |
| 31 | Bill Create / Edit | `BillForm` | Manual bill entry | bills | `POST /bills`, `PATCH /bills/:id`, `GET /vendors`, `GET /products` | `bill:create` / `bill:edit` | N | N |
| 32 | Pay Bill | `BillPay` | Record bill payment | bills | `POST /bills/:id/payments` | `payment:create` | N | N |
| 33 | Vendor Picker | `VendorPicker` | Inline vendor select with quick-add | vendors | `GET /vendors`, `POST /vendors` | `vendor:view` / `vendor:create` | Y | N |

---

### 4.8 Expenses — Vendors (3 screens)

| # | Screen | Route key | Purpose | Module | Endpoints | Perm | Cache | Push |
|---|--------|-----------|---------|--------|-----------|------|-------|------|
| 34 | Vendor List | `VendorList` | Search vendors | vendors | `GET /vendors` | `vendor:view` | Y | N |
| 35 | Vendor Detail | `VendorDetail` | Profile + AP balance + recent bills | vendors | `GET /vendors/:id`, `GET /bills?vendorId=` | `vendor:view` | Y | N |
| 36 | Vendor Quick-Add | `VendorForm` | Inline create | vendors | `POST /vendors` | `vendor:create` | N | N |

---

### 4.9 Approvals (3 screens)

| # | Screen | Route key | Purpose | Module | Endpoints | Perm | Cache | Push |
|---|--------|-----------|---------|--------|-----------|------|-------|------|
| 37 | Approvals Queue | `ApprovalQueue` | Pending items awaiting current user | approvals | `GET /approvals/my-pending`, `GET /approvals/dashboard` | `approval:view` | Y | Y |
| 38 | Approval Detail | `ApprovalDetail` | Full document view + comments + history | approvals | `GET /approvals/:id`, `GET /approvals/entity/:type/:id` | `approval:view` | Y | Y |
| 39 | Approve/Reject Sheet | `ApprovalDecision` | Confirm + comment + submit | approvals | `POST /approvals/:id/approve`, `/reject` | `approval:decide` | N | N |

---

### 4.10 Time Tracking (4 screens)

| # | Screen | Route key | Purpose | Module | Endpoints | Perm | Cache | Push |
|---|--------|-----------|---------|--------|-----------|------|-------|------|
| 40 | Timer | `Timer` | Start/stop active timer with project + task | time-entries | `POST /time-entries`, `PATCH /time-entries/:id` | `time_entry:create` | N | N |
| 41 | Time Entry List | `TimeEntryList` | Daily/weekly entries grouped | time-entries | `GET /time-entries` | `time_entry:view` | Y | N |
| 42 | Time Entry Form | `TimeEntryForm` | Manual entry create/edit | time-entries | `POST /time-entries`, `PATCH /time-entries/:id` | `time_entry:create` / `edit` | N | N |
| 43 | Submit for Approval | `TimeSubmit` | Batch select + submit | time-entries | `POST /time-entries/submit` | `time_entry:create` | N | N |

---

### 4.11 Projects (3 screens)

| # | Screen | Route key | Purpose | Module | Endpoints | Perm | Cache | Push |
|---|--------|-----------|---------|--------|-----------|------|-------|------|
| 44 | Project List | `ProjectList` | Active projects | projects | `GET /projects` | `project:view` | Y | N |
| 45 | Project Detail | `ProjectDetail` | Header + team + recent activity | projects | `GET /projects/:id`, `GET /time-entries?projectId=`, `GET /expenses?projectId=` | `project:view` | Y | N |
| 46 | Project Profitability | `ProjectProfit` | Revenue / cost / margin | projects | `GET /projects/:id/profitability` | `project:view` | Y | N |

---

### 4.12 Banking (4 screens)

| # | Screen | Route key | Purpose | Module | Endpoints | Perm | Cache | Push |
|---|--------|-----------|---------|--------|-----------|------|-------|------|
| 47 | Bank Account List | `BankAccountList` | Account cards with balance | banking | `GET /banking/accounts` | `bank_account:view` | Y | N |
| 48 | Transactions Feed | `BankTxnList` | Transactions for selected account | banking | `GET /banking/accounts/:id/transactions` | `bank_account:view` | Y | N |
| 49 | Transaction Detail | `BankTxnDetail` | Match status, linked JE | banking | `GET /banking/transactions/:id` | `bank_account:view` | Y | N |
| 50 | Reconciliation (Read-only) | `ReconciliationView` | View open recon session status | banking | `GET /banking/reconciliations/:id` | `bank_account:reconcile` | Y | N |

> Reconcile *editing* is web-only.

---

### 4.13 Reports (Read-only, 6 screens)

| # | Screen | Route key | Purpose | Module | Endpoints | Perm | Cache | Push |
|---|--------|-----------|---------|--------|-----------|------|-------|------|
| 51 | Profit & Loss | `ReportPL` | P&L for date range | reports | `GET /reports/profit-loss` | `report:view_basic` | Y | N |
| 52 | Balance Sheet | `ReportBS` | BS as-of date | reports | `GET /reports/balance-sheet` | `report:view_basic` | Y | N |
| 53 | Cash Flow | `ReportCashFlow` | Indirect cash flow | reports | `GET /reports/cash-flow` | `report:view_basic` | Y | N |
| 54 | AR Aging | `ReportARAging` | AR aging buckets | reports | `GET /reports/ar-aging` | `report:view_basic` | Y | N |
| 55 | AP Aging | `ReportAPAging` | AP aging buckets | reports | `GET /reports/ap-aging` | `report:view_basic` | Y | N |
| 56 | Sales by Customer | `ReportSalesByCustomer` | Customer revenue ranking | reports | `GET /reports/sales-by-customer` | `report:view_basic` | Y | N |

All reports support PDF/CSV export via existing `/reports/*/export` endpoints (mobile uses share sheet to export/email).

---

### 4.14 Products (3 screens)

| # | Screen | Route key | Purpose | Module | Endpoints | Perm | Cache | Push |
|---|--------|-----------|---------|--------|-----------|------|-------|------|
| 57 | Product List | `ProductList` | Search products / services | products | `GET /products` | `product:view` | Y | N |
| 58 | Product Detail | `ProductDetail` | Pricing, qty on hand, accounts | products | `GET /products/:id` | `product:view` | Y | N |
| 59 | Stock Card | `ProductStockCard` | Inventory transactions for product | products, inventory | `GET /inventory/product/:id/stock-card` | `inventory:view` | Y | N |

> Product create/edit is web-only in v1 (long form with many tax/account fields).

---

### 4.15 Notifications (2 screens)

| # | Screen | Route key | Purpose | Module | Endpoints | Perm | Cache | Push |
|---|--------|-----------|---------|--------|-----------|------|-------|------|
| 60 | Notifications Inbox | `NotificationInbox` | List + mark read + deep-link to source | notifications | `GET /notifications`, `POST /notifications/:id/read` | — | Y | Y |
| 61 | Notification Settings | `NotificationSettings` | Toggle event types (email/push) + register device | notifications | `GET/PATCH /notifications/preferences`. **TBD Day 103:** `POST /mobile/devices/register` (FCM/APNs token) | — | Y | N |

---

### 4.16 Profile / Settings / More (5 screens)

| # | Screen | Route key | Purpose | Module | Endpoints | Perm | Cache | Push |
|---|--------|-----------|---------|--------|-----------|------|-------|------|
| 62 | Profile | `Profile` | View/edit name, avatar, role | users, auth | `GET /auth/me`, `PATCH /users/:id` | — | Y | N |
| 63 | Change Password | `ChangePassword` | Change password (auth required) | auth | `POST /auth/change-password` | — | N | N |
| 64 | Currency Preference | `CurrencyPref` | Display currency selection | currencies | `GET /currencies`, `GET /currencies/base` | `currency:view` | Y | N |
| 65 | About / Version | `About` | App version, support links, privacy | — | — | — | N | N |
| 66 | More Menu | `MoreMenu` | Hub for tab #5 (links to all secondary screens) | — | — | — | N | N |

---

## 5. Total Screen Count

**66 screens** across 16 areas. Phased delivery:

| Phase | Screens | Areas |
|-------|---------|-------|
| **A** (MVP, ~3 weeks) | 1–6, 7–9, 10–15, 23–28, 60–66 | Auth, Dashboard, Invoices, Expenses + Receipt Scan, Notifications, Profile |
| **B** (~2 weeks) | 16–22, 29–39 | Estimates, Customers, Bills, Vendors, Approvals |
| **C** (~2 weeks) | 40–46, 47–50 | Time Tracking, Projects, Banking |
| **D** (~1 week) | 51–59 | Reports, Products |

---

## 6. Cross-Cutting Concerns

These apply to **every** screen and are not repeated in per-screen MDs.

### 6.1 Auth & Token Handling
- JWT stored in **secure storage** (iOS Keychain / Android Keystore via `react-native-keychain`).
- Every authenticated request: `Authorization: Bearer <jwt>`.
- 401 → kick to Login, clear token.
- Token refresh: `POST /auth/refresh` on 401 once per request before logout fallback.

### 6.2 API Client
- Single Axios (or fetch) instance with base URL, default headers, request/response interceptors.
- Multi-company: include active `companyId` from in-memory store; `POST /auth/switch-company` rotates the JWT.
- Standard error envelope from backend: `{ statusCode, message, error }` — surface `message` to user.

### 6.3 Data Fetching & Cache
- React Query (TanStack Query) recommended:
  - Default `staleTime: 60s`, `cacheTime: 10m`.
  - Invalidate on mutation (e.g. `POST /invoices` → invalidate `['invoices']`).
  - Refetch on screen focus + pull-to-refresh.
- All list endpoints support `?page=&limit=&sortBy=&sortOrder=`. Use **infinite query** for paginated lists.

### 6.4 Permissions
- After login, fetch `GET /auth/my-permissions` once, store in memory.
- Hide actions/screens the user lacks permission for.
- Fall back to backend 403 — surface as toast: "You don't have permission to do that."

### 6.5 Currency & Number Formatting
- Use Intl.NumberFormat with the **company base currency** (from `GET /currencies/base`).
- Multi-currency docs (invoices/bills/expenses) show their own `currencyCode` + base equivalent below in muted text.

### 6.6 Date Handling
- All date inputs/outputs in ISO-8601 (`YYYY-MM-DD` for dates, full ISO for timestamps).
- Display in user's device locale via `Intl.DateTimeFormat`.

### 6.7 Attachments / File Upload
- Multipart POST to existing attachment endpoints.
- iOS: `react-native-image-picker` + `expo-image-manipulator` (resize to ≤2048px, JPEG quality 0.8).
- Android: same.

### 6.8 Push Notifications
- iOS: APNs via Firebase. Android: FCM.
- Permission request on first launch after login (deferred prompt — show rationale screen first).
- Register device token: **TBD endpoint** `POST /mobile/devices/register` (Day 103, Week 19).
- Notification payload includes `{ deepLink, entityType, entityId, message }`.

### 6.9 Empty / Loading / Error States (every list & detail screen)
- **Loading:** skeleton placeholders for first load; spinner for paginated next-page.
- **Empty:** illustration + 1-line headline + primary CTA ("Create your first invoice").
- **Error:** retry button + plain-language message.
- **Permission denied:** dedicated 403 view ("Ask your admin for access").

### 6.10 Pull-to-Refresh
- All list screens. Resets pagination + refetches first page.

### 6.11 Search & Filter Pattern
- List headers have a search input (debounced 300ms) + filter icon → opens bottom sheet with the screen's filters.
- Filters reflected in URL params for shareability via deep link.

### 6.12 Forms
- React Hook Form + Zod schemas (mirror backend DTOs).
- Inline validation on blur; submit-time errors highlight first invalid field + scroll to it.

### 6.13 Multi-Company
- Active company stored in memory + persisted preference.
- Tab/header chip shows current company name; tap → opens Company Switcher.

### 6.14 Audit / Telemetry
- Log key events (login, create-invoice, approval-decide) to backend audit-trail (already automatic server-side) and to Sentry/analytics on mobile.

### 6.15 Offline Behavior (v1: online-only)
- Reads: served from React Query cache while offline (last-known data).
- Writes: blocked with toast ("You're offline. Try again when connected.").
- Future v2: mutation queue + `/mobile/sync?since=` delta sync (Day 101).

---

## 7. Endpoints Pending (Week 19 work)

These mobile-specific endpoints are **planned but not yet implemented**. Per-screen MDs reference them with a `TBD` flag and show fallback paths using existing endpoints:

| Endpoint | Day | Used by screens |
|----------|-----|-----------------|
| `GET /mobile/dashboard` | 101 | 7 (Home Dashboard) |
| `GET /mobile/quick-stats` | 101 | 8 |
| `GET /mobile/sync?since=` | 101 | All cached lists (v2) |
| `POST /mobile/receipts/scan` | 102 | 26, 27 |
| `POST /mobile/devices/register` | 103 | 61 |
| Push delivery infra (FCM/APNs adapter) | 103 | 10, 12, 17, 29, 30, 37, 38, 60 |

Mobile screens can be built against existing endpoints today; the mobile-specific endpoints are optimizations.

---

## 8. Per-Screen Documentation Template

Each per-screen MD lives in [`/documentation/mobile/`](./mobile/) with this structure:

```markdown
# MOBILE_<AREA>_<SCREEN>.md

## 1. Screen Purpose
## 2. Wireframe Description (text only — designer builds visuals)
## 3. Component Breakdown (RN components, state, props)
## 4. Navigation (entry routes, exit routes, params, deep link)
## 5. Backend Integration
   - Endpoint, request payload, response shape, permission, errors
## 6. State & Data Flow (cache keys, optimistic updates, pagination)
## 7. Offline Behavior
## 8. Push Triggers
## 9. Edge Cases & Validation
## 10. Acceptance Criteria checklist
```

---

## 9. Build Order Recommendation

**Week 1 (after this index is approved):**
1. Auth screens (1–6)
2. Home Dashboard (7)
3. Profile + Company Switcher + More menu plumbing (62, 66)

**Week 2:**
4. Invoices: list → detail → form → send → payment (10–15)
5. Customers: list, detail, quick-add (20–22)

**Week 3 — flagship feature:**
6. Receipt Scan flow (26, 27, 28)
7. Expenses list + detail + form (23–25)

**Week 4:**
8. Approvals queue + decision (37–39) → push notifications wired (Day 103)
9. Bills + Vendors (29–36)

**Week 5:**
10. Time Tracking (40–43)
11. Projects (44–46)

**Week 6:**
12. Banking read-only (47–50)
13. Reports (51–56)
14. Products read-only (57–59)
15. Notifications inbox + settings (60–61) + remaining settings screens

---

## 10. Open Items (to revisit before Phase A starts)

- React Native version: 0.74+ recommended; confirm with engineer.
- Navigation library: React Navigation v7.
- State: React Query for server state; Zustand for in-memory client state (active company, permissions, theme).
- Theming: light + dark mode from day-one.
- Localization: stub i18n keys but English-only in v1.
- App icons / splash: design dependency, not a screen.
- E2E: Detox or Maestro — pick before Phase B.

---

## 11. Index of Per-Screen MDs

> The following files will be created as per-screen MDs in batches. This section is updated as each batch lands.

- ✅ [`mobile/MOBILE_AUTH_SPLASH.md`](./mobile/MOBILE_AUTH_SPLASH.md)
- ✅ [`mobile/MOBILE_AUTH_LOGIN.md`](./mobile/MOBILE_AUTH_LOGIN.md)
- ✅ [`mobile/MOBILE_AUTH_FORGOT_PASSWORD.md`](./mobile/MOBILE_AUTH_FORGOT_PASSWORD.md)
- ✅ [`mobile/MOBILE_AUTH_RESET_PASSWORD.md`](./mobile/MOBILE_AUTH_RESET_PASSWORD.md)
- ✅ [`mobile/MOBILE_AUTH_MFA.md`](./mobile/MOBILE_AUTH_MFA.md)
- ✅ [`mobile/MOBILE_AUTH_COMPANY_SWITCHER.md`](./mobile/MOBILE_AUTH_COMPANY_SWITCHER.md)
- ✅ [`mobile/MOBILE_HOME_DASHBOARD.md`](./mobile/MOBILE_HOME_DASHBOARD.md)
- ✅ [`mobile/MOBILE_HOME_QUICK_STATS.md`](./mobile/MOBILE_HOME_QUICK_STATS.md)
- ✅ [`mobile/MOBILE_HOME_ACTIVITY_FEED.md`](./mobile/MOBILE_HOME_ACTIVITY_FEED.md)
- ✅ [`mobile/MOBILE_INVOICES_LIST.md`](./mobile/MOBILE_INVOICES_LIST.md)
- ✅ [`mobile/MOBILE_INVOICES_FILTER.md`](./mobile/MOBILE_INVOICES_FILTER.md)
- ✅ [`mobile/MOBILE_INVOICES_DETAIL.md`](./mobile/MOBILE_INVOICES_DETAIL.md)
- ✅ [`mobile/MOBILE_INVOICES_FORM.md`](./mobile/MOBILE_INVOICES_FORM.md)
- ✅ [`mobile/MOBILE_INVOICES_SEND.md`](./mobile/MOBILE_INVOICES_SEND.md)
- ✅ [`mobile/MOBILE_INVOICES_PAYMENT.md`](./mobile/MOBILE_INVOICES_PAYMENT.md)
- ✅ [`mobile/MOBILE_ESTIMATES_LIST.md`](./mobile/MOBILE_ESTIMATES_LIST.md)
- ✅ [`mobile/MOBILE_ESTIMATES_DETAIL.md`](./mobile/MOBILE_ESTIMATES_DETAIL.md)
- ✅ [`mobile/MOBILE_ESTIMATES_FORM.md`](./mobile/MOBILE_ESTIMATES_FORM.md)
- ✅ [`mobile/MOBILE_ESTIMATES_CONVERT.md`](./mobile/MOBILE_ESTIMATES_CONVERT.md)
- ✅ [`mobile/MOBILE_CUSTOMERS_LIST.md`](./mobile/MOBILE_CUSTOMERS_LIST.md)
- ✅ [`mobile/MOBILE_CUSTOMERS_DETAIL.md`](./mobile/MOBILE_CUSTOMERS_DETAIL.md)
- ✅ [`mobile/MOBILE_CUSTOMERS_QUICK_ADD.md`](./mobile/MOBILE_CUSTOMERS_QUICK_ADD.md)
- ✅ [`mobile/MOBILE_EXPENSES_LIST.md`](./mobile/MOBILE_EXPENSES_LIST.md)
- ✅ [`mobile/MOBILE_EXPENSES_DETAIL.md`](./mobile/MOBILE_EXPENSES_DETAIL.md)
- ✅ [`mobile/MOBILE_EXPENSES_FORM.md`](./mobile/MOBILE_EXPENSES_FORM.md)
- ✅ [`mobile/MOBILE_EXPENSES_RECEIPT_CAMERA.md`](./mobile/MOBILE_EXPENSES_RECEIPT_CAMERA.md) ★
- ✅ [`mobile/MOBILE_EXPENSES_RECEIPT_CONFIRM.md`](./mobile/MOBILE_EXPENSES_RECEIPT_CONFIRM.md) ★
- ✅ [`mobile/MOBILE_EXPENSES_CATEGORY_PICKER.md`](./mobile/MOBILE_EXPENSES_CATEGORY_PICKER.md)
- ✅ [`mobile/MOBILE_BILLS_LIST.md`](./mobile/MOBILE_BILLS_LIST.md)
- ✅ [`mobile/MOBILE_BILLS_DETAIL.md`](./mobile/MOBILE_BILLS_DETAIL.md)
- ✅ [`mobile/MOBILE_BILLS_FORM.md`](./mobile/MOBILE_BILLS_FORM.md)
- ✅ [`mobile/MOBILE_BILLS_PAY.md`](./mobile/MOBILE_BILLS_PAY.md)
- ✅ [`mobile/MOBILE_BILLS_VENDOR_PICKER.md`](./mobile/MOBILE_BILLS_VENDOR_PICKER.md)
- ✅ [`mobile/MOBILE_VENDORS_LIST.md`](./mobile/MOBILE_VENDORS_LIST.md)
- ✅ [`mobile/MOBILE_VENDORS_DETAIL.md`](./mobile/MOBILE_VENDORS_DETAIL.md)
- ✅ [`mobile/MOBILE_VENDORS_QUICK_ADD.md`](./mobile/MOBILE_VENDORS_QUICK_ADD.md)
- ✅ [`mobile/MOBILE_APPROVALS_QUEUE.md`](./mobile/MOBILE_APPROVALS_QUEUE.md)
- ✅ [`mobile/MOBILE_APPROVALS_DETAIL.md`](./mobile/MOBILE_APPROVALS_DETAIL.md)
- ✅ [`mobile/MOBILE_APPROVALS_DECISION.md`](./mobile/MOBILE_APPROVALS_DECISION.md)
- ✅ [`mobile/MOBILE_TIME_TIMER.md`](./mobile/MOBILE_TIME_TIMER.md)
- ✅ [`mobile/MOBILE_TIME_LIST.md`](./mobile/MOBILE_TIME_LIST.md)
- ✅ [`mobile/MOBILE_TIME_FORM.md`](./mobile/MOBILE_TIME_FORM.md)
- ✅ [`mobile/MOBILE_TIME_SUBMIT.md`](./mobile/MOBILE_TIME_SUBMIT.md)
- ✅ [`mobile/MOBILE_PROJECTS_LIST.md`](./mobile/MOBILE_PROJECTS_LIST.md)
- ✅ [`mobile/MOBILE_PROJECTS_DETAIL.md`](./mobile/MOBILE_PROJECTS_DETAIL.md)
- ✅ [`mobile/MOBILE_PROJECTS_PROFITABILITY.md`](./mobile/MOBILE_PROJECTS_PROFITABILITY.md)
- ✅ [`mobile/MOBILE_BANKING_ACCOUNT_LIST.md`](./mobile/MOBILE_BANKING_ACCOUNT_LIST.md)
- ✅ [`mobile/MOBILE_BANKING_TXN_LIST.md`](./mobile/MOBILE_BANKING_TXN_LIST.md)
- ✅ [`mobile/MOBILE_BANKING_TXN_DETAIL.md`](./mobile/MOBILE_BANKING_TXN_DETAIL.md)
- ✅ [`mobile/MOBILE_BANKING_RECONCILIATION_VIEW.md`](./mobile/MOBILE_BANKING_RECONCILIATION_VIEW.md)
- ✅ [`mobile/MOBILE_REPORTS_PL.md`](./mobile/MOBILE_REPORTS_PL.md)
- ✅ [`mobile/MOBILE_REPORTS_BS.md`](./mobile/MOBILE_REPORTS_BS.md)
- ✅ [`mobile/MOBILE_REPORTS_CASH_FLOW.md`](./mobile/MOBILE_REPORTS_CASH_FLOW.md)
- ✅ [`mobile/MOBILE_REPORTS_AR_AGING.md`](./mobile/MOBILE_REPORTS_AR_AGING.md)
- ✅ [`mobile/MOBILE_REPORTS_AP_AGING.md`](./mobile/MOBILE_REPORTS_AP_AGING.md)
- ✅ [`mobile/MOBILE_REPORTS_SALES_BY_CUSTOMER.md`](./mobile/MOBILE_REPORTS_SALES_BY_CUSTOMER.md)
- ✅ [`mobile/MOBILE_PRODUCTS_LIST.md`](./mobile/MOBILE_PRODUCTS_LIST.md)
- ✅ [`mobile/MOBILE_PRODUCTS_DETAIL.md`](./mobile/MOBILE_PRODUCTS_DETAIL.md)
- ✅ [`mobile/MOBILE_PRODUCTS_STOCK_CARD.md`](./mobile/MOBILE_PRODUCTS_STOCK_CARD.md)
- ✅ [`mobile/MOBILE_NOTIFICATIONS_INBOX.md`](./mobile/MOBILE_NOTIFICATIONS_INBOX.md)
- ✅ [`mobile/MOBILE_NOTIFICATIONS_SETTINGS.md`](./mobile/MOBILE_NOTIFICATIONS_SETTINGS.md)
- ✅ [`mobile/MOBILE_PROFILE_PROFILE.md`](./mobile/MOBILE_PROFILE_PROFILE.md)
- ✅ [`mobile/MOBILE_PROFILE_CHANGE_PASSWORD.md`](./mobile/MOBILE_PROFILE_CHANGE_PASSWORD.md)
- ✅ [`mobile/MOBILE_PROFILE_CURRENCY_PREFS.md`](./mobile/MOBILE_PROFILE_CURRENCY_PREFS.md)
- ✅ [`mobile/MOBILE_PROFILE_COMPANY_SETTINGS.md`](./mobile/MOBILE_PROFILE_COMPANY_SETTINGS.md)
- ✅ [`mobile/MOBILE_PROFILE_ABOUT.md`](./mobile/MOBILE_PROFILE_ABOUT.md)

---

*Document version: 1.0*
*Created: 2026-04-29*
*Phase 4, Week 19 — Mobile App Specification*
*Next: review this index → on approval, begin per-screen MDs in `documentation/mobile/`*
