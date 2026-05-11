# MOBILE_INVOICES_LIST

**Screen #:** 10 · **Area:** Sales — Invoices · **Route key:** `InvoiceList`
**Design ref:** [Design Brief §3 — Screen 10](../MOBILE_APP_DESIGN_BRIEF.md#screen-10--invoice-list)
**Index ref:** [Master Index §4.3](../MOBILE_APP_SCREENS_INDEX.md#43-sales--invoices-6-screens)

---

## 1. Screen Purpose

Browse, search, segment, and act on the company's invoices. Primary daily-use screen for the sales side of the business — supports infinite scroll, pull-to-refresh, segmented status filters, advanced filter sheet, swipe-row actions, and FAB to create.

## 2. Wireframe Description

1. **Large title header** "Invoices" with subtitle showing total count + outstanding amount ("142 invoices · $24,310 outstanding").
2. **Search bar** (debounced 300ms) — searches invoice number, reference number, customer name.
3. **Filter funnel icon** trailing the search; shows badge dot if any filters are active beyond the segmented control.
4. **Segmented control:** All · Unpaid · Overdue · Paid · Draft. Selecting a segment maps to a status query.
5. **List rows** (one per invoice, ~80px tall):
   - Leading: customer avatar/initial in tinted circle.
   - Title row: invoice number (e.g. `INV-0042`) + customer name.
   - Subtitle row: due date (with relative emphasis — "Due in 3 days" / "Overdue 5 days" in danger color).
   - Trailing: amount (tabular figures) stacked over status pill.
6. **FAB** "+" → opens InvoiceForm.

Pull-to-refresh at top. Infinite scroll at bottom with skeleton rows. Swipe row right → "Mark Sent" / "Record Payment" (context-dependent). Swipe row left → "Void" with confirm.

## 3. Component Breakdown

| Component | Props / State |
|-----------|---------------|
| `LargeTitleHeader` | title, subtitle, trailing slot |
| `SearchBar` | value, onChange (debounced) |
| `IconButton` (filter) | onPress → InvoiceFilter sheet, badge dot |
| `SegmentedControl` | options=['All','Unpaid','Overdue','Paid','Draft'], value |
| `InvoiceRow` | invoice payload, onPress, onSwipeLeft, onSwipeRight |
| `StatusPill` | status enum |
| `FAB` | onPress |
| `Skeleton` rows | for first load + page load |
| `EmptyState` | "No invoices yet" + Create CTA |

State owned: `searchQuery`, `segment`, `advancedFilters` (from sheet), `refreshing`, `swipeOpenRowId`.

## 4. Navigation

- **Entry:** Sales tab default; deep link `finanx://invoices`.
- **Exit:**
  - Tap row → `InvoiceDetail` with `{ id }`.
  - FAB → `InvoiceForm` (mode: create).
  - Filter funnel → `InvoiceFilter` sheet.
  - Swipe action "Record Payment" → `InvoicePayment` sheet.
  - Swipe action "Mark Sent" → fires `POST /invoices/:id/send` inline (no nav).
  - Swipe action "Void" → confirm sheet, then fires `POST /invoices/:id/void`.

## 5. Backend Integration

**Permission required:** `invoice:view`.

### 5.1 List invoices
**Endpoint:** `GET /api/v1/invoices`
**Query params** (from `QueryInvoicesDto`):
```ts
{
  status?: 'DRAFT'|'SENT'|'PARTIALLY_PAID'|'PAID'|'OVERDUE'|'VOID',  // single value only
  customerId?: string,
  dateFrom?: string,            // YYYY-MM-DD (filters on invoiceDate)
  dateTo?: string,              // YYYY-MM-DD (filters on invoiceDate)
  search?: string,              // searches invoiceNumber, referenceNumber, customer.displayName
  sortBy?: 'invoiceNumber'|'invoiceDate'|'dueDate'|'totalAmount'|'amountDue'|'status'|'createdAt',
  sortOrder?: 'asc'|'desc',    // default 'desc'
  page?: number,                // default 1
  limit?: number,               // default 20
  classId?: string,
  departmentId?: string
}
```

> **`status` is a single enum value — not an array.** The backend does not support multi-status filtering in one request.

**Segment → query mapping:**
- `All` → omit `status`.
- `Unpaid` → issue **3 parallel requests** with `status=SENT`, `status=PARTIALLY_PAID`, `status=OVERDUE` then merge + sort results client-side.
- `Overdue` → `status=OVERDUE`.
- `Paid` → `status=PAID`.
- `Draft` → `status=DRAFT`.

**Response 200:**
```ts
{
  data: {
    items: Array<{
      id: string,
      invoiceNumber: string,
      referenceNumber?: string,
      customer: { id, displayName, email },
      invoiceDate: string,
      dueDate: string,
      totalAmount: number,
      amountDue: number,
      amountPaid: number,
      currencyCode: string,
      status: 'DRAFT'|'SENT'|'PARTIALLY_PAID'|'PAID'|'OVERDUE'|'VOID',
      isRecurring: boolean,
      sentAt?: string,
      paidAt?: string,
      createdAt: string
    }>,
    pagination: {
      total: number,      // NOT totalItems
      page: number,
      limit: number,
      totalPages: number
    }
  }
}
```

### 5.2 Header summary
**Endpoint:** `GET /api/v1/invoices/summary`
**Response 200:**
```ts
{
  data: {
    draft:         { count: number },
    sent:          { count: number },
    partiallyPaid: { count: number },
    paid:          { count: number, amount: number },
    overdue:       { count: number, amount: number },
    void:          { count: number },
    totals: {
      totalInvoiced: number,
      totalUnpaid: number,
      totalPaid: number
    }
  }
}
```

Use `totals.totalUnpaid` for the header subtitle outstanding amount and `draft.count + sent.count + partiallyPaid.count + overdue.count` for total active invoices.

### 5.3 Statuses (for filter chips)
**Endpoint:** `GET /api/v1/invoices/statuses`
**Response 200:**
```ts
{
  data: Array<{
    value: string,
    label: string,
    color: string,
    description: string,
    allowEdit: boolean,
    allowDelete: boolean,
    allowSend: boolean,
    allowVoid: boolean,
    allowPayment: boolean
  }>
}
```
Cached at `staleTime: Infinity`; rarely changes.

### 5.4 Inline mutations from swipe
- **Send:** `POST /api/v1/invoices/:id/send` (perm `invoice:send`). **No request body** — email is sent automatically with default template.
- **Void:** `POST /api/v1/invoices/:id/void` (perm `invoice:void`). Body `{ reason?: string }`. Only allowed on SENT, PARTIALLY_PAID, OVERDUE statuses.
- **Record payment:** routes to `InvoicePayment` sheet (see [MOBILE_INVOICES_PAYMENT.md](./MOBILE_INVOICES_PAYMENT.md)).

### 5.5 Errors
- `403` → permission-denied banner.
- `5xx` → retry button on the error state.
- Inline mutation `400` (e.g. void on a PAID invoice) → toast with backend `message`.

## 6. State & Data Flow

**Cache key:** `['invoices','list', { segment, search, advancedFilters }]` with **infinite query** semantics. `getNextPageParam` returns `page+1` if `page < totalPages`.

> For the `Unpaid` segment, use a dedicated cache key `['invoices','list','unpaid']` and merge the 3 parallel responses before rendering.

**Summary cache key:** `['invoices','summary']`, `staleTime: 60s`.

**Cross-screen invalidation:**
- After `InvoiceForm` create/edit success → invalidate `['invoices','list']` (all variants) + `['invoices','summary']` + `['dashboard']`.
- After Send / Record Payment / Void → optimistic row update first (status pill), then invalidate the list query for definitive refresh.

**Search debounce** 300ms; rapid typing cancels in-flight requests via React Query's `signal`.

**Pagination:** `limit=20`. `FlashList` for virtualization.

## 7. Offline Behavior

- Cached pages render while offline; banner "Showing last data from {time}".
- Search/filter changes that produce a new cache key with no cached pages → show inline offline error in list area.
- Swipe actions block with toast "You're offline".

## 8. Push Triggers

- Push for "Invoice paid" / "Invoice overdue" can deep-link to InvoiceDetail. When user returns to InvoiceList, summary + list are refetched on focus.

## 9. Edge Cases & Validation

- **Recurring badge:** if `isRecurring` true, show a small ↻ chip next to invoice number.
- **Currency:** if invoice currency ≠ company base currency, show converted base amount in muted text below the primary amount.
- **Long customer names:** truncate to one line; full name visible on detail.
- **"Overdue" segment** — `OVERDUE` is a real status value in the backend (not just a computed client-side flag). The backend returns it as a distinct status on invoices whose due date has passed.
- **amountMin/amountMax filtering** is client-side only — the backend `QueryInvoicesDto` does not support these params. Apply them as a post-fetch filter on the loaded page data.
- **Bulk action** is web-only in v1 (backend endpoint `POST /invoices/bulk-action` exists but mobile UI does not expose it).
- **Permission gating:** hide FAB if `invoice:create` missing; hide swipe-send if `invoice:send` missing; hide swipe-void if `invoice:void` missing.
- **Empty state per segment:** "No overdue invoices · Nice work" for the Overdue segment; per-segment copy keeps the empty feeling positive where appropriate.

## 10. Acceptance Criteria

- [ ] Cold load: skeleton rows render in <200ms; first page in <1.5s on 4G.
- [ ] Search debounces and updates list without flicker.
- [ ] Segmented control switches status filter and resets pagination.
- [ ] Filter funnel opens the sheet; applied filters show badge dot.
- [ ] Pull-to-refresh updates list + header summary.
- [ ] Swipe right "Mark Sent" fires with no body and the row's status pill updates optimistically.
- [ ] Swipe left "Void" requires confirm; only shown on SENT/PARTIALLY_PAID/OVERDUE rows.
- [ ] FAB hidden if user lacks `invoice:create`.
- [ ] Empty state shows for new company and per-segment emptiness.
- [ ] Light + dark mockups implemented.
