# MOBILE_CUSTOMERS_DETAIL

**Screen #:** 21 · **Area:** Sales — Customers · **Route key:** `CustomerDetail`
**Design ref:** [Design Brief §5 — Screen 21](../MOBILE_APP_DESIGN_BRIEF.md#screen-21--customer-detail)
**Index ref:** [Master Index §4.5](../MOBILE_APP_SCREENS_INDEX.md#45-sales--customers-3-screens)

---

## 1. Screen Purpose

Profile + AR snapshot + recent activity for one customer. Quick-launch native intents (call, email, map). Tabs for invoices, estimates, and activity history.

## 2. Wireframe Description

1. **Profile hero:**
   - Large avatar (colored initial), displayName as H1.
   - Status pill ("Active" / "Inactive").
   - **Contact icon row** under name: Call · Email · Map (each tap opens native intent). Icons disabled (greyed) when corresponding field absent.
2. **AR Summary card:**
   - Outstanding balance (`currentBalance` in big text, danger color if > 0).
   - **Aging mini-bar** — fetched from the AR aging report (see §5.4). Buckets: Current / 1–30 / 31–60 / 61–90 / 90+.
   - Quick-action button "New Invoice" → InvoiceForm with customer prefilled.
3. **Tabs:** Overview · Invoices · Estimates · Activity.

### Overview tab
- Contact info: email, phone, mobile, fax, website (each tappable).
- Billing address (with map preview) — from `billingAddress.line1` … `billingAddress.country`.
- Shipping address (if different) — from `shippingAddress` object.
- Default payment terms — `paymentTerms` string (e.g. "Net 30").
- Preferred currency.
- Notes (collapsible).
- Edit button (opens edit form — same as quick-add but with all advanced fields, see §9).

### Invoices tab
- Embedded list of customer's invoices (shares the `InvoiceRow` component, scoped via `customerId`).

### Estimates tab
- Same pattern, `EstimateRow` scoped via `customerId`.

### Activity tab
- Audit-trail timeline scoped to this customer + their related entities.

Pull-to-refresh on each tab.

## 3. Component Breakdown

| Component | Props / State |
|-----------|---------------|
| `ProfileHero` | avatar, displayName, status |
| `ContactIconRow` | call/email/map handlers |
| `ARSummaryCard` | currentBalance, agingBuckets, currency, onNewInvoice |
| `TopTabs` | Overview/Invoices/Estimates/Activity |
| `OverviewSection` | grouped read-only rows |
| `InvoiceRow`, `EstimateRow` | reused from list screens |
| `ActivityTimeline` | from audit-trail |
| `Skeleton`, `EmptyState` | |

State owned: `activeTab`, `mutating`.

## 4. Navigation

- **Entry:**
  - `CustomerList` row tap.
  - From InvoiceDetail / EstimateDetail customer chip.
  - Deep link `finanx://customer/:id`.
- **Exit:**
  - Call/Email/Map → external intents.
  - "New Invoice" CTA → `InvoiceForm` (mode=create) with `customerId` prefilled.
  - Tab row tap (Invoices/Estimates) → respective detail.
  - Edit (Overview) → `CustomerEditForm` (full form; this screen is the catalog of fields, but the visual sheet is shared with quick-add — see [MOBILE_CUSTOMERS_QUICK_ADD](./MOBILE_CUSTOMERS_QUICK_ADD.md) §9).
  - Back → previous.

## 5. Backend Integration

**Permission required:** `customer:view` (edit gated by `customer:edit`, delete by `customer:delete`).

### 5.1 Get customer
**Endpoint:** `GET /api/v1/customers/:id`
**Response 200:**
```ts
{
  success: true,
  message: string,
  data: {
    id: string,
    customerType: string,
    displayName: string,
    companyName: string | null,
    firstName: string | null,
    lastName: string | null,
    middleName: string | null,
    title: string | null,
    suffix: string | null,
    email: string | null,
    phone: string | null,
    mobile: string | null,
    fax: string | null,
    website: string | null,
    billingAddress: {
      line1: string | null,
      line2: string | null,
      city: string | null,
      state: string | null,
      postalCode: string | null,
      country: string | null
    },
    shippingAddress: {
      line1: string | null,
      line2: string | null,
      city: string | null,
      state: string | null,
      postalCode: string | null,
      country: string | null
    },
    taxNumber: string | null,
    taxExempt: boolean,
    paymentTerms: string | null,     // e.g. "Net 30" — NOT paymentTermsDays (number)
    openingBalance: number,
    currentBalance: number,          // use this for the AR summary card — NOT arBalance (doesn't exist)
    creditLimit: number | null,
    preferredCurrency: string | null,
    notes: string | null,
    isActive: boolean,
    createdAt: string,
    updatedAt: string
  }
}
```

> **No `arBalance` or `arAging` fields** — the customer object does not contain AR aging buckets. Use `currentBalance` for the balance display. Aging bucket breakdown requires a separate call to the AR aging report (see §5.4).

### 5.2 Customer's invoices
**Endpoint:** `GET /api/v1/invoices?customerId=:id&limit=20`
Reuse the same response shape as InvoiceList.

### 5.3 Customer's estimates
**Endpoint:** `GET /api/v1/estimates?customerId=:id&limit=20`

### 5.4 AR aging (for hero card aging mini-bar)
**Endpoint:** `GET /api/v1/reports/ar-aging`
**Query params:**

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `asOfDate` | ISO date string | No | Defaults to today |

> **Important:** This endpoint does NOT support `customerId` or `summaryOnly` filtering — it always returns the full company-wide AR aging report. To get per-customer aging, read the `customers` array from the response and find the matching `customerId`. If the customer has no open invoices, they will not appear in the array. Bucket key names are camelCase: `current`, `days1to30`, `days31to60`, `days61to90`, `days91plus`.

**Response 200:**
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
      invoices: Array<{ ... }>
    }>,
    totals: { current, days1to30, days31to60, days61to90, days91plus, total }
  }
}
```

Client-side: find `customers.find(c => c.customerId === id)` and map `days1to30` → "1–30", `days31to60` → "31–60", `days61to90` → "61–90", `days91plus` → "90+" for the mini-bar labels.

Cache key: `['reports','ar-aging', { asOfDate }]` — already fetched by Home dashboard, so this is usually a cache hit.

### 5.5 Activity / Audit
**Endpoint:** `GET /api/v1/audit-trail?entityType=CUSTOMER&entityId=:id` (perm `audit:view`).

### 5.6 Update (from Edit)
**Endpoint:** `PATCH /api/v1/customers/:id` (perm `customer:edit`).
**Body:** any subset of create fields (flat field names, e.g. `billingAddressLine1`, NOT nested objects — the request format differs from the response format).

### 5.7 Deactivate / Delete (from Edit form's destructive action)
**Endpoint:** `DELETE /api/v1/customers/:id` (perm `customer:delete`).
**Behavior:** Soft delete — sets `isActive = false`. The customer is NOT permanently removed.
**Response 200:**
```ts
{ success: true, message: 'Customer deactivated successfully', data: null }
```
> **No open-invoice check** — the backend does not throw a 400 if the customer has open invoices. Deactivation always succeeds (no error to handle beyond standard 403/404).

## 6. State & Data Flow

**Cache keys:**
- `['customers','detail', id]`, 60s stale.
- `['invoices','list', { customerId: id }]`.
- `['estimates','list', { customerId: id }]`.
- `['audit-trail', { entityType: 'CUSTOMER', entityId: id }]`.
- `['reports','ar-aging', { asOfDate }]` — shared with Home; filter client-side for this customer.

**Tab queries lazy-load on first focus** to keep cold-load fast.

**Cross-screen invalidation:** any invoice/estimate mutation involving this customer invalidates this detail's invoice/estimate lists.

## 7. Offline Behavior

Cached detail + cached tab data render offline. Native intents (call/email/map) work offline.

## 8. Push Triggers

Some pushes ("Customer paid invoice") deep-link to `InvoiceDetail`, not here. Refresh on focus picks up updated balance.

## 9. Edge Cases & Validation

- **Disabled contact icons:** if email/phone absent, icon is greyed and non-tappable.
- **Map intent:** only opens if `billingAddress.line1` + `billingAddress.city` both non-null.
- **Inactive customer:** show "Inactive" pill; some actions disabled (New Invoice greyed) until reactivated.
- **No AR aging data:** if the customer has no open invoices, they won't appear in the ar-aging response — show zero/empty aging bar rather than error.
- **currentBalance display:** show in danger color when > 0, hidden or muted when 0. Balance is in company base currency.
- **Avatar fallback:** initial of displayName, color hashed from id.
- **Permission gating:** Edit hidden without `customer:edit`; Delete hidden without `customer:delete`.

## 10. Acceptance Criteria

- [ ] Hero loads with skeleton; real data renders without layout shift.
- [ ] Contact icons open native intents (verified on iOS + Android).
- [ ] AR aging mini-bar populated from `reports/ar-aging` response filtered to this customerId.
- [ ] `currentBalance` shown in danger color when > 0.
- [ ] Tabs lazy-load and cache; switching is instant after first load.
- [ ] "New Invoice" routes to InvoiceForm with customer prefilled.
- [ ] Edit opens edit sheet/form; saving updates this screen without re-mount.
- [ ] Deactivate (delete) softly deactivates customer and pops screen.
- [ ] Light + dark mockups implemented.
