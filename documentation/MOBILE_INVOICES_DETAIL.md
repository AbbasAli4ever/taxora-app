# MOBILE_INVOICES_DETAIL

**Screen #:** 12 · **Area:** Sales — Invoices · **Route key:** `InvoiceDetail`
**Design ref:** [Design Brief §3 — Screen 12](../MOBILE_APP_DESIGN_BRIEF.md#screen-12--invoice-detail)
**Index ref:** [Master Index §4.3](../MOBILE_APP_SCREENS_INDEX.md#43-sales--invoices-6-screens)

---

## 1. Screen Purpose

Full read view of a single invoice with all primary actions — Send, Share PDF, Record Payment, Edit, Duplicate, Void, Delete. Surfaces line items, totals, payment history, notes, and audit/activity timeline.

## 2. Wireframe Description

1. **Hero header** (parallax shrinks on scroll):
   - Status pill at top.
   - Big amount (tabular), currency code muted next to it.
   - Subtitle: "Due {date} · {customer.displayName}".
   - Customer avatar/initial right side.
2. **Action icon row** (5 round icons with labels): Send · Share PDF · Record Payment · Edit · More.
   - "More" overflow opens an action sheet: Duplicate · Void · Delete.
3. **Line Items card:** each line shows description, qty × unit price = subtotal, with tax/discount sub-rows when applicable.
4. **Totals card:**
   - Subtotal
   - Discount (if `discountAmount > 0` — shows `discountType` + `discountValue`)
   - Tax (per rate breakdown collapsible)
   - **Total** (emphasized)
   - **Amount Due** (highlighted; danger color if overdue, success if zero)
5. **Payment History card** (only if payments exist): list of payments with date, method, reference, amount.
6. **Notes / Terms** (collapsible) — note field names: `notes` and `termsAndConditions`.
7. **Activity timeline** (collapsible at bottom): created, sent, viewed, paid, voided events.

Pull-to-refresh refetches.

## 3. Component Breakdown

| Component | Props / State |
|-----------|---------------|
| `InvoiceHeroHeader` | parallax, status, amount, currency, dueDate, customer |
| `ActionIconRow` | actions[], permissions filter, statusInfo flags |
| `LineItemRow` | description, qty, unitPrice, discountPercent, taxPercent, subtotal |
| `TotalsCard` | subtotal, discountType, discountValue, discountAmount, taxAmount, total, amountDue |
| `PaymentHistoryRow` | date, method, reference, amount |
| `CollapsibleSection` | title, children |
| `ActivityTimelineRow` | event, actor, time |
| `Skeleton` for hero + cards |
| `ActionSheet` (More) | iOS native + Android bottom sheet |

State owned: `expandedSections`, `mutating` (during action calls).

## 4. Navigation

- **Entry:**
  - `InvoiceList` row tap with `{ id }`.
  - Deep link `finanx://invoice/:id`.
  - From `CustomerDetail` → invoice row.
  - From notification (paid, overdue).
- **Exit:**
  - Back → previous.
  - Send → fires `POST /invoices/:id/send` directly (no sheet — see §5.3).
  - Share PDF → native share sheet with PDF blob.
  - Record Payment → `InvoicePayment` screen (passes `invoiceId`, `amountDue`, `currencyCode`).
  - Edit → `InvoiceForm` (mode=edit).
  - Duplicate → `InvoiceForm` (mode=create, prefilled from this invoice).
  - Void → confirm sheet → API call → refresh.
  - Delete → confirm sheet (only if DRAFT) → API call → pop.

## 5. Backend Integration

**Permission required:** `invoice:view`.
**Action gating:** use `statusInfo` flags from the response (see §5.1) — do not compute action visibility client-side.

### 5.1 Get invoice
**Endpoint:** `GET /api/v1/invoices/:id`
**Response 200:**
```ts
{
  data: {
    id: string,
    invoiceNumber: string,
    referenceNumber?: string,
    status: 'DRAFT'|'SENT'|'PARTIALLY_PAID'|'PAID'|'OVERDUE'|'VOID',
    statusInfo: {
      label: string,
      color: string,
      description: string,
      allowEdit: boolean,
      allowDelete: boolean,
      allowSend: boolean,
      allowVoid: boolean,
      allowPayment: boolean
    },
    invoiceDate: string,
    dueDate?: string,
    paymentTerms?: string,
    sentAt?: string,
    paidAt?: string,
    voidedAt?: string,
    voidReason?: string,
    customer: {
      id: string,
      displayName: string,
      email?: string,
      phone?: string,
      billingAddressLine1?: string,
      billingAddressLine2?: string,
      billingCity?: string,
      billingState?: string,
      billingPostalCode?: string,
      billingCountry?: string
    },
    currencyCode: string,
    exchangeRate: number,
    lineItems: Array<{
      id: string,
      product?: { id: string, name: string, sku?: string, type: string },
      description: string,
      quantity: number,
      unitPrice: number,
      discountPercent: number,
      taxPercent: number,
      amount: number,
      sortOrder: number,
      classId?: string,
      departmentId?: string
    }>,
    subtotal: number,
    discountType?: 'PERCENTAGE'|'FIXED',
    discountValue?: number,
    discountAmount: number,
    taxAmount: number,
    totalAmount: number,
    amountPaid: number,
    amountDue: number,
    depositAccount?: { id: string, name: string, accountNumber?: string },
    notes?: string,
    termsAndConditions?: string,   // NOT 'terms'
    isRecurring: boolean,
    recurringFrequency?: string,
    nextRecurringDate?: string,
    recurringEndDate?: string,
    projectId?: string,
    project?: { id: string, name: string },
    payments: Array<{
      id: string,
      paymentDate: string,
      amount: number,
      paymentMethod?: string,
      referenceNumber?: string,
      notes?: string,
      createdAt: string
    }>,
    journalEntryId?: string,
    createdAt: string,
    updatedAt: string
  }
}
```

> **Action visibility:** use `statusInfo.allowEdit`, `statusInfo.allowSend`, `statusInfo.allowVoid`, `statusInfo.allowPayment`, `statusInfo.allowDelete` to show/hide action buttons. Do not recompute from status string.

### 5.2 Get PDF
**Endpoint:** `GET /api/v1/invoices/:id/pdf`
**Response:** `application/pdf` blob.
Mobile: download to temp file, then open native share sheet.

### 5.3 Send
**Endpoint:** `POST /api/v1/invoices/:id/send`
**Permission:** `invoice:send`
**Body:** none — email is sent automatically using the customer's email on file with a default template.
**Response 200:** full invoice object (same shape as §5.1) with `status: 'SENT'`.

> There is no send customization sheet. Tapping Send shows a simple confirmation alert: "Send invoice {invoiceNumber} to {customer.email}?" → Confirm → API call.
> If customer has no email: show alert "No email on file for this customer. Add an email on the web app first."

### 5.4 Record payment
**Endpoint:** `POST /api/v1/invoices/:id/payments`
See [MOBILE_INVOICES_PAYMENT.md](./MOBILE_INVOICES_PAYMENT.md).

### 5.5 Void
**Endpoint:** `POST /api/v1/invoices/:id/void`
**Permission:** `invoice:void`
**Allowed on:** SENT, PARTIALLY_PAID, OVERDUE only.
**Body:** `{ reason?: string }`
**Response 200:** full invoice object with `status: 'VOID'`.
**Errors:**
- `400` if status is DRAFT → toast "Draft invoices should be deleted, not voided."
- `400` if status is PAID → toast "Paid invoices cannot be voided. Use a credit note instead."

### 5.6 Delete (DRAFT only)
**Endpoint:** `DELETE /api/v1/invoices/:id`
**Permission:** `invoice:delete`
**Response 200:** `{ message: string }`
**Errors:** `400` if status ≠ DRAFT → toast "Only draft invoices can be deleted. Void instead."

### 5.7 Activity / Audit (timeline)
**Endpoint:** `GET /api/v1/audit-trail?entityType=INVOICE&entityId=:id`
**Permission:** `audit:view`. If missing, hide the timeline section silently.

## 6. State & Data Flow

**Cache keys:**
- `['invoices','detail', id]`, `staleTime: 30s`.
- `['audit-trail', { entityType: 'INVOICE', entityId: id }]`.

**Action button visibility:** driven by `statusInfo` flags from the cached response + permission checks. No separate state.

**Optimistic updates:**
- Void: optimistically swap status pill to "Voiding…" disabled state; on success commit; on error revert + toast.
- Payment (returning from screen): optimistically prepend payment row and decrement `amountDue`; refetch detail to confirm.

**Cross-screen invalidation on any mutation:**
- Invalidate `['invoices','list']`, `['invoices','summary']`, `['dashboard']`, `['reports','ar-aging']`, `['audit-trail']`, and `['invoices','detail', id]`.

## 7. Offline Behavior

- Cached detail renders while offline.
- All mutating actions blocked with toast "You're offline".
- Share PDF requires download — blocked offline unless PDF was previously cached.

## 8. Push Triggers

- Push "Invoice paid" → deep link to this screen → focus refetch shows the new payment in history.
- Push "Invoice overdue" → deep link here → status pill shows OVERDUE.

## 9. Edge Cases & Validation

- **Recurring badge:** if `isRecurring`, show ↻ chip and a small section "Next: {nextRecurringDate}".
- **Multi-currency:** show invoice currency primary; show base-currency-converted total in muted subtitle on the totals card if `currencyCode != company.baseCurrency`.
- **Project link:** if `projectId` present, show "Project: {project.name}" as a tappable chip → ProjectDetail.
- **Notes / termsAndConditions:** field is `termsAndConditions` (not `terms`) — map correctly.
- **Send with no customer email:** guard before showing confirm — alert user to add email on web.
- **Amount Due == 0:** show "Paid in full" badge; `statusInfo.allowPayment` will be false — hide Record Payment.
- **Audit timeline absent permission:** hide section silently (no permission-denied banner inside detail).
- **Delete vs Void copy:** if user taps Delete on a non-DRAFT invoice, surface helpful message pointing to Void.

## 10. Acceptance Criteria

- [ ] Detail loads with skeleton; real data renders without layout shift.
- [ ] Action buttons shown/hidden per `statusInfo` flags + permissions (not computed from status string).
- [ ] Send fires with no body; confirmation alert shows customer email.
- [ ] PDF share opens native share sheet with the file.
- [ ] Void confirm + API call + status pill updates without leaving the screen.
- [ ] Returning from Record Payment screen updates Payment History optimistically and refetches.
- [ ] `termsAndConditions` displays correctly (not empty due to wrong field name).
- [ ] Tapping project chip routes to ProjectDetail.
- [ ] Pull-to-refresh refreshes both detail and timeline.
- [ ] Light + dark mockups implemented.
