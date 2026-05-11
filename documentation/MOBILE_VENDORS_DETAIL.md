# MOBILE_VENDORS_DETAIL

**Screen #:** 35 · **Area:** Expenses — Vendors · **Route key:** `VendorDetail`
**Design ref:** [Design Brief §8 — Screen 35](../MOBILE_APP_DESIGN_BRIEF.md#screens-3436--vendor-list--detail--quick-add)
**Index ref:** [Master Index §4.8](../MOBILE_APP_SCREENS_INDEX.md#48-expenses--vendors-3-screens)

---

## 1. Screen Purpose

Profile + AP snapshot + recent activity for one vendor. Mirrors [CustomerDetail](./MOBILE_CUSTOMERS_DETAIL.md) — same hero, contact intents, tabs — but sourced from vendor endpoints with bills/expenses tabs replacing invoices/estimates.

## 2. Wireframe Description

1. **Profile hero:** avatar (colored initial), displayName as H1, status pill ("Active" / "Inactive"), contact icon row (Call · Email · Map).
2. **AP Summary card:** `currentBalance` in muted color (not danger — AP is an obligation), aging mini-bar (fetched from AP aging report, see §5.4), quick-action button "New Bill" → BillForm with vendor prefilled.
3. **Tabs:** Overview · Bills · Expenses · Activity.

### Overview tab
- Contact info: email, phone, mobile, fax, website.
- Address — from `address.line1`, `address.city`, etc. (nested object).
- Default payment terms — `paymentTerms` string (e.g. "Net 30").
- **Tax fields:** Tax Number (`taxNumber`) and Business ID (`businessIdNo`) — read-only display.
- **1099 toggle status:** `track1099` boolean — show "1099 Vendor" badge when true.
- Preferred currency.
- Notes (collapsible).
- Edit button → [`VendorForm`](./MOBILE_VENDORS_QUICK_ADD.md) edit mode.

### Bills tab
- Embedded list scoped to this vendor (`BillRow` reused with `vendorId` filter).

### Expenses tab
- Embedded list scoped to this vendor (`ExpenseRow` with `vendorId` filter).

### Activity tab
- Audit-trail timeline.

Pull-to-refresh on each tab.

## 3. Component Breakdown

Same primitives as [CustomerDetail](./MOBILE_CUSTOMERS_DETAIL.md): `ProfileHero`, `ContactIconRow`, `APSummaryCard`, `TopTabs`, `OverviewSection`, `BillRow`, `ExpenseRow`, `ActivityTimeline`, `Skeleton`, `EmptyState`.

State owned: `activeTab`, `mutating`.

## 4. Navigation

- **Entry:**
  - `VendorList` row tap.
  - From `BillDetail` / `ExpenseDetail` vendor chip.
  - Deep link `finanx://vendor/:id`.
- **Exit:**
  - Call/Email/Map → external intents.
  - "New Bill" → `BillForm` (mode=create) with `vendorId` prefilled.
  - Tab row tap (Bills/Expenses) → respective detail.
  - Edit (Overview) → `VendorForm` edit.
  - Back → previous.

## 5. Backend Integration

**Permission required:** `vendor:view`. Edit gated by `vendor:edit`, delete by `vendor:delete`.

### 5.1 Get vendor
**Endpoint:** `GET /api/v1/vendors/:id`
**Response 200:**
```ts
{
  success: true,
  message: string,
  data: {
    id: string,
    vendorType: string,                  // 'Business' | 'Individual'
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
    address: {                           // single nested object (NOT billingAddress)
      line1: string | null,
      line2: string | null,
      city: string | null,
      state: string | null,
      postalCode: string | null,
      country: string | null
    },
    taxNumber: string | null,            // NOT taxId
    businessIdNo: string | null,
    track1099: boolean,                  // NOT is1099
    paymentTerms: string | null,         // e.g. "Net 30" — NOT paymentTermsDays (number)
    preferredCurrency: string | null,
    openingBalance: number,
    currentBalance: number,              // use for AP summary card — NOT apBalance (doesn't exist)
    creditLimit: number | null,
    notes: string | null,
    isActive: boolean,
    createdAt: string,
    updatedAt: string
  }
}
```

> **No `apBalance` or `apAging` fields** — the vendor object does not include AP aging buckets. Use `currentBalance` for the balance display. Aging bucket breakdown requires a separate call to the AP aging report (see §5.4).

### 5.2 Vendor's bills
**Endpoint:** `GET /api/v1/bills?vendorId=:id&limit=20`. Same shape as BillList.

### 5.3 Vendor's expenses
**Endpoint:** `GET /api/v1/expenses?vendorId=:id&limit=20`. Same shape as ExpenseList.

### 5.4 AP aging (for hero card aging mini-bar)
**Endpoint:** `GET /api/v1/reports/ap-aging`
**Query params:**

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `asOfDate` | ISO date string | No | Defaults to today |

> **Important:** This endpoint does NOT support `vendorId` or `summaryOnly` filtering — it always returns the full company-wide AP aging report. To get per-vendor aging, read the `vendors` array from the response and find the matching `vendorId`. Bucket key names are camelCase: `current`, `days1to30`, `days31to60`, `days61to90`, `days91plus`.

**Response 200:**
```ts
{
  data: {
    asOfDate: string,
    vendors: Array<{
      vendorId: string,
      vendorName: string,
      current: number,
      days1to30: number,
      days31to60: number,
      days61to90: number,
      days91plus: number,
      total: number,
      bills: Array<{ ... }>
    }>,
    totals: { current, days1to30, days31to60, days61to90, days91plus, total }
  }
}
```

Client-side: `vendors.find(v => v.vendorId === id)` then map `days1to30` → "1–30", `days31to60` → "31–60", `days61to90` → "61–90", `days91plus` → "90+".

### 5.5 Activity / Audit
**Endpoint:** `GET /api/v1/audit-trail?entityType=VENDOR&entityId=:id` (perm `audit:view`).

### 5.6 Update (from Edit)
**Endpoint:** `PATCH /api/v1/vendors/:id` (perm `vendor:edit`).
**Body:** any subset of create fields (flat field names as in the request DTO: `addressLine1`, `paymentTerms`, `taxNumber`, `track1099`, etc.).

### 5.7 Deactivate / Delete
**Endpoint:** `DELETE /api/v1/vendors/:id` (perm `vendor:delete`).
**Behavior:** Soft delete — sets `isActive = false`. Vendor is NOT permanently deleted.
**Response 200:**
```ts
{ success: true, message: 'Vendor deactivated successfully', data: null }
```

> **No open-bills constraint** — the backend does not block deactivation if the vendor has open bills. Deactivation always succeeds (no 400 error to handle).

## 6. State & Data Flow

**Cache keys:**
- `['vendors','detail', id]` (60s).
- `['bills','list', { vendorId: id }]`.
- `['expenses','list', { vendorId: id }]`.
- `['audit-trail', { entityType: 'VENDOR', entityId: id }]`.
- `['reports','ap-aging', { asOfDate }]` — shared with Home; filter client-side for this vendor.

Tab queries lazy-load on first focus.

Cross-screen invalidation: any bill/expense mutation involving this vendor invalidates this detail's tab lists.

## 7. Offline Behavior

Cached detail + cached tab data render. Native intents work offline.

## 8. Push Triggers

"Bill overdue" / "Bill paid" deep-links to `BillDetail`. `currentBalance` updates on focus.

## 9. Edge Cases & Validation

- **Disabled contact icons** when fields absent.
- **Map intent** only opens when `address.line1` + `address.city` both non-null.
- **Inactive vendor:** "Inactive" pill; "New Bill" disabled.
- **1099 badge:** show "1099" badge near name when `track1099 === true`.
- **No AP aging data:** if vendor has no open bills, they won't appear in ap-aging response — show zero/empty aging bar.
- **currentBalance display:** muted color when > 0, hidden or muted when 0.
- **Permissions:** Edit hidden without `vendor:edit`; Delete hidden without `vendor:delete`.

## 10. Acceptance Criteria

- [ ] Hero loads with skeleton.
- [ ] Contact icons open native intents.
- [ ] AP aging mini-bar populated from `reports/ap-aging` filtered to this vendorId.
- [ ] `currentBalance` shown in muted color when > 0.
- [ ] Tabs lazy-load and cache.
- [ ] "New Bill" routes to BillForm with vendor prefilled.
- [ ] Edit opens form; saving updates this screen without re-mount.
- [ ] Deactivate softly deactivates vendor and pops screen.
- [ ] Light + dark mockups implemented.
