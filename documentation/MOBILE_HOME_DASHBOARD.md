# MOBILE_HOME_DASHBOARD

**Screen #:** 7 · **Area:** Home / Dashboard · **Route key:** `Home`
**Design ref:** [Design Brief §2 — Screen 7](../MOBILE_APP_DESIGN_BRIEF.md#screen-7--home-dashboard--flagship)
**Index ref:** [Master Index §4.2](../MOBILE_APP_SCREENS_INDEX.md#42-home--dashboard-3-screens)

---

## 1. Screen Purpose

Primary glance screen — owner/manager opens the app to see cash, AR, AP, and recent activity at a glance, with one-tap entries into the most common create flows. Optimized for fast first paint via cached reads + parallel fetches.

## 2. Wireframe Description

Scrollable, with a parallax-shrinking header.

1. **Header bar:** company name + chevron (taps → CompanySelect), notification bell with unread badge, avatar (taps → Profile).
2. **Greeting:** "Good morning, {firstName}" + small date.
3. **Hero KPI carousel** (horizontal swipe, 4 cards): Cash Balance · Net Income MTD · Outstanding AR · Outstanding AP. Each card: icon, label, big number (animated count-up), 30-day sparkline, MoM delta pill.
4. **Cash Flow chart:** 30-day area chart. Period toggle pills above (7D / 30D / 90D).
5. **Quick Actions row:** 4 icon tiles — New Invoice, Scan Receipt, New Expense, Record Payment.
6. **AR / AP summary:** two side-by-side cards with mini aging-bucket bars (Current / 1–30 / 31–60 / 90+).
7. **Recent Activity:** vertical list of 5 entries. "See all" footer link → ActivityFeed.

Pull-to-refresh refreshes all queries.

## 3. Component Breakdown

| Component | Props / State |
|-----------|---------------|
| `ParallaxHeader` | company chip, notif bell with badge, avatar |
| `KPICard` | label, value, currency, sparkline series, deltaPct |
| `KPICarousel` | array of KPICard, snap paging |
| `PeriodTogglePills` | options=['7D','30D','90D'], value, onChange |
| `AreaChart` | series, gradient, dark-mode glow |
| `QuickActionTile` | icon, label, onPress (deep links into create flows) |
| `AgingMiniBar` | buckets array, total |
| `ActivityRow` | iconType, title, subtitle, time, amount |
| `Skeleton` variants | for KPI, chart, list |

State owned: `period: '7D'|'30D'|'90D'`, `refreshing`.

## 4. Navigation

- **Entry:** AppTabs default.
- **Exit:**
  - Tap company chip → `CompanySelect` (in-app mode).
  - Tap bell → `NotificationInbox`.
  - Tap avatar → `Profile`.
  - Tap KPI card → `QuickStats` with `{ kpi: 'cash'|'netIncome'|'ar'|'ap' }`.
  - Tap quick action → respective create screen (`InvoiceForm`, `ReceiptCamera`, `ExpenseForm`, `InvoicePayment` picker).
  - Tap "See all" → `ActivityFeed`.
  - Tap activity row → entity detail (deep link by `entityType`).

## 5. Backend Integration

**Permission required:** `dashboard:view` (Admin / Standard / Limited / Reports-Only have it).

All responses are wrapped in:
```ts
{ success: true, message: string, data: <payload> }
```

### 5.1 Financial overview (KPIs)
**Endpoint:** `GET /api/v1/dashboard/financial-overview`
**Query params:**

| Param | Type | Required | Values / Notes |
|-------|------|----------|----------------|
| `period` | string | No | `this_month` (default) \| `last_month` \| `this_quarter` \| `last_quarter` \| `this_year` \| `last_year` \| `custom` |
| `startDate` | ISO date string | No | Required when `period=custom` |
| `endDate` | ISO date string | No | Required when `period=custom` |

**Response 200:**
```ts
{
  data: {
    period: { start: string, end: string },
    revenue: {
      current: number,
      previous: number,
      changeAmount: number,
      changePercent: number | null,
      changeDirection: 'up' | 'down' | 'flat' | 'new'
    },
    expenses: {
      current: number,
      previous: number,
      changeAmount: number,
      changePercent: number | null,
      changeDirection: 'up' | 'down' | 'flat' | 'new'
    },
    netIncome: {
      current: number,
      previous: number,
      changeAmount: number,
      changePercent: number | null,
      changeDirection: 'up' | 'down' | 'flat' | 'new'
    },
    cashBalance: number,   // sum of all Bank account balances
    totalAR: number,       // sum of all open invoice amountDue
    totalAP: number        // sum of all open bill amountDue
  }
}
```
> `cashBalance`, `totalAR`, and `totalAP` are plain numbers in the company base currency — no per-field `currencyCode` or `deltaPct`. Use `netIncome.changePercent` / `changeDirection` for the MoM delta pill on the Net Income KPI card. Cash / AR / AP delta pills are not available from this endpoint.

### 5.2 Cash flow trend (chart)
**Endpoint:** `GET /api/v1/dashboard/cash-flow-overview`
**Query params:** same `period`, `startDate`, `endDate` as §5.1.

**Response 200:**
```ts
{
  data: {
    bankAccounts: Array<{
      accountId: string,
      name: string,
      institution: string | null,
      last4: string | null,
      currentBalance: number
    }>,
    totalCashBalance: number,
    last30Days: {
      totalInflow: number,
      totalOutflow: number,
      netCashFlow: number
    },
    dailyFlow: Array<{
      date: string,         // "YYYY-MM-DD"
      inflow: number,
      outflow: number
      // net is not returned — compute client-side as inflow - outflow
    }>
  }
}
```
> Use `dailyFlow` (not `series`) to plot the area chart. Compute `net = inflow - outflow` on the client. `last30Days` provides the summary totals shown below the chart.

### 5.3 Sparkline data (per KPI)
- **Cash sparkline:** derive from `dailyFlow` in `cash-flow-overview` (compute `inflow - outflow` per entry).
- **AR / AP sparklines:** no dedicated time-series endpoint — omit the sparkline or render a static total bar from `totals` in §5.4.

**Net Income sparkline — separate call:**
**Endpoint:** `GET /api/v1/dashboard/revenue-expense-trend`
**Query params:** same `period`, `startDate`, `endDate` as §5.1.

**Response 200:**
```ts
{
  data: {
    granularity: 'daily' | 'weekly' | 'monthly',  // auto-resolved from period length
    data: Array<{
      date: string,     // bucket key: "YYYY-MM-DD" (daily), "YYYY-Www" (weekly), "YYYY-MM" (monthly)
      label: string,    // human-readable: "May 5", "W18", "May 2026"
      revenue: number,
      expenses: number
      // net income per point = revenue - expenses (compute client-side)
    }>
  }
}
```

### 5.4 Aging summaries
**Endpoints:**
- `GET /api/v1/reports/ar-aging`
- `GET /api/v1/reports/ap-aging`

**Query params (each):**

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `asOfDate` | ISO date string | No | Defaults to today |

> `groupByCustomer`, `groupByVendor`, and `summaryOnly` are **not** supported. The response always includes per-customer / per-vendor detail — read only the `totals` object on this screen.

**Response 200 — AR aging:**
```ts
{
  data: {
    asOfDate: string,
    customers: Array<{
      customerId: string,
      customerName: string,
      current: number,
      days1to30: number,
      days31to60: number,
      days61to90: number,
      days91plus: number,
      total: number,
      invoices: Array<{
        invoiceId: string,
        invoiceNumber: string,
        invoiceDate: string,
        dueDate: string | null,
        totalAmount: number,
        amountDue: number,
        daysOverdue: number,
        bucket: 'current' | 'days1to30' | 'days31to60' | 'days61to90' | 'days91plus'
      }>
    }>,
    totals: {
      current: number,
      days1to30: number,
      days31to60: number,
      days61to90: number,
      days91plus: number,
      total: number
    }
  }
}
```

**Response 200 — AP aging:** identical shape, with `vendors` / `vendorId` / `vendorName` / `bills` instead of `customers` / `customerId` / `customerName` / `invoices`.

> Bucket key names are camelCase (`days1to30`, `days31to60`, `days61to90`, `days91plus`), **not** hyphenated strings. Map them to display labels (`1–30`, `31–60`, `61–90`, `90+`) in the UI.

### 5.5 Recent activity (top 5)
**Endpoint:** `GET /api/v1/dashboard/recent-activity`
**Query params:**

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `limit` | number (1–50) | No | Defaults to 5 |
| `period` | string | No | Same presets as §5.1 |

**Response 200:**
```ts
{
  data: {
    activities: Array<{
      id: string,
      type: 'INVOICE' | 'BILL' | 'EXPENSE' | 'JOURNAL_ENTRY' | 'PAYMENT',
      label: string,        // e.g. "Invoice INV-0042"
      description: string,  // e.g. "Sent to Acme Co"
      status: string,
      amount: number,
      occurredAt: string    // ISO datetime
    }>
  }
}
```
> The response is nested under `activities` (not a root array). Fields `entityId`, `actorName`, `currencyCode`, and `iconHint` are **not** returned — derive the row icon from `type`, and omit actor attribution in v1. Deep-link targets must be resolved by `type` + `id`.

### 5.6 Notifications unread count (for bell badge)
**Endpoint:** `GET /api/v1/notifications/unread-count`
**Permission required:** `notification:view`

**Response 200:**
```ts
{ data: { unreadCount: number } }
```
> The field is `unreadCount` (not `count`).

## 6. State & Data Flow

**Cache keys** (TanStack Query):
- `['dashboard','financial-overview', { period }]`
- `['dashboard','cash-flow-overview', { period }]`
- `['reports','ar-aging', { asOfDate }]`
- `['reports','ap-aging', { asOfDate }]`
- `['dashboard','recent-activity', { limit: 5 }]`
- `['notifications','unread-count']`

**Settings:** `staleTime: 60s`, `refetchOnWindowFocus: true`, `refetchOnReconnect: true`.

**Pull-to-refresh:** invalidates all six keys in parallel.

**Cross-screen invalidation:**
- After creating an Invoice/Bill/Expense → invalidate `financial-overview`, `cash-flow-overview`, `recent-activity`, and the relevant aging key (`ar-aging` or `ap-aging`).
- After Record Payment → same.
- After approving in Approvals → invalidate `financial-overview` + `recent-activity`.

**Period change** updates only the queries whose key includes `period`.

## 7. Offline Behavior

- All six queries serve from cache while offline; show a non-blocking offline banner ("Showing last data from {time}. Reconnect to refresh.").
- Pull-to-refresh while offline shows a toast and does not error-out.
- Quick actions that require network (create flows) will themselves block on submit.

## 8. Push Triggers

None deep-link to Home directly. However, when push delivers (invoice paid, bill overdue, approval requested), if the user is on Home, increment the bell badge by invalidating `notifications/unread-count`.

## 9. Edge Cases & Validation

- **No data state:** new company with no invoices/expenses — KPIs read zero, chart shows flat line, Recent Activity shows empty illustration with "Create your first invoice" primary CTA. Quick actions remain available.
- **Currency:** all KPIs use the company `baseCurrency` from `auth/me`. Multi-currency invoices contribute their base-currency-converted amounts (backend does this).
- **Permission denied** (`dashboard:view` missing): display a permission-denied state with link to More tab.
- **Greeting i18n stub:** "Good morning/afternoon/evening" based on device clock; English-only in v1.
- **First paint:** show skeleton shimmer for KPI cards, chart, and list. Render real data in place — no layout shift.
- **Animated count-up:** disable when `prefers-reduced-motion`.
- **Header parallax:** disable when reduced motion is on.

## 10. Acceptance Criteria

- [ ] Cold first paint: skeleton renders within 200ms; real data in ≤1.5s on 4G.
- [ ] All KPI cards animate count-up on first appearance only (not on every refresh).
- [ ] Period toggle changes chart and (where applicable) KPIs without flicker.
- [ ] Pull-to-refresh updates all data and shows the iOS-native bounce / Android Material spinner.
- [ ] Bell badge reflects unread count and clears when user visits Inbox and marks read.
- [ ] Quick actions deep link into the correct create flows.
- [ ] Empty state displays cleanly for a brand-new company.
- [ ] Light + dark mockups implemented.
