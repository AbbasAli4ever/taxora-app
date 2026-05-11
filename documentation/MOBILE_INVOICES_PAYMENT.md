# MOBILE_INVOICES_PAYMENT

**Screen #:** 15 · **Area:** Sales — Invoices · **Route key:** `InvoicePayment`
**Design ref:** [Design Brief §3 — Screen 15](../MOBILE_APP_DESIGN_BRIEF.md#screen-15--record-payment)
**Index ref:** [Master Index §4.3](../MOBILE_APP_SCREENS_INDEX.md#43-sales--invoices-6-screens)

---

## 1. Screen Purpose

Record a manual payment against an invoice (cash, check, bank transfer, credit card, or other). Supports partial payments, payment-method selection, deposit account routing, reference and notes.

## 2. Wireframe Description

Full screen (not a sheet — this flow benefits from dedicated focus and a big numeric input).

1. **Top summary card** (read-only): invoice number, customer, `amountDue` (big, danger color if overdue), currency.
2. **Payment Method picker:** segmented icon picker — Cash · Check · Bank Transfer · Credit Card · Other. Single-select. Defaults to "Other" if not selected.
3. **Amount input** — large numeric keypad-style input, defaults to `amountDue`. Helper text "Outstanding: {amountDue}" with quick-fill buttons "Full" and "Half".
4. **Date** picker — defaults to today. Max = today (no future dates).
5. **Deposit Account** picker — list of bank accounts; only shown if user has multiple accounts. Default: account flagged as default or first bank account in base currency.
6. **Reference Number** input — optional, for check #, transfer ID, etc. (max 100 chars).
7. **Notes** textarea (optional, max 2000 chars).
8. **Sticky footer:** big primary "Record Payment" button.

Success state: confirmation overlay with checkmark + amount, brief confetti micro-animation, auto-dismisses to Invoice Detail.

## 3. Component Breakdown

| Component | Props / State |
|-----------|---------------|
| `InvoiceSummaryCard` | invoiceNumber, customerName, amountDue, currencyCode, dueDate |
| `SegmentedIconPicker` | options=['CASH','CHECK','BANK_TRANSFER','CREDIT_CARD','OTHER'], value |
| `AmountInput` (large) | currencyCode, value, onChange, quickFill=['full','half'] |
| `DateField` | value, onChange, maxDate=today |
| `DepositAccountPicker` | id, onChange (hidden if only 1 account) |
| `TextInput` (reference) | value, onChange, maxLength=100 |
| `TextInput` (notes, multiline) | value, onChange, maxLength=2000 |
| `Button` (sticky) | "Record Payment", loading prop |
| `SuccessOverlay` | confetti, checkmark, amount |

State owned (RHF):
```ts
{
  amount: number,                  // required, > 0, <= amountDue
  paymentDate: string,             // required, YYYY-MM-DD, max today
  paymentMethod?: 'CASH'|'CHECK'|'BANK_TRANSFER'|'CREDIT_CARD'|'OTHER',  // uppercase
  referenceNumber?: string,
  notes?: string,
  depositAccountId?: string
}
```

## 4. Navigation

- **Entry:**
  - `InvoiceDetail` Record Payment action with `{ invoiceId, amountDue, currencyCode, dueDate, invoiceNumber, customerName }`.
  - `InvoiceList` swipe-right "Record Payment" with same params.
- **Exit:**
  - Success → pop to `InvoiceDetail` (cache invalidated so Payment History and amountDue update).
  - Cancel / back → confirm if form is dirty.

## 5. Backend Integration

**Permission required:** `invoice:edit`
> The backend gates payment recording on `invoice:edit` permission (not a separate `payment:create`). Ensure this permission is checked before showing the Record Payment action.

### 5.1 Deposit accounts list (for picker)
**Endpoint:** `GET /api/v1/banking/accounts`
**Permission:** `bank_account:view`
**Response 200:**
```ts
{
  data: Array<{
    id: string,
    name: string,
    accountNumber?: string,
    currencyCode?: string,
    balance?: number,
    isDefault?: boolean
  }>
}
```
Cache `staleTime: 60s`. Hide picker if only 1 account returned (auto-select it silently).

### 5.2 Record payment
**Endpoint:** `POST /api/v1/invoices/:invoiceId/payments`
**Body** (per `RecordPaymentDto`):
```ts
{
  amount: number,                   // required, min 0.01, cannot exceed amountDue
  paymentDate: string,              // required, YYYY-MM-DD
  paymentMethod?: 'CASH'|'CHECK'|'BANK_TRANSFER'|'CREDIT_CARD'|'OTHER',  // uppercase; defaults to 'OTHER'
  referenceNumber?: string,         // max 100 chars
  notes?: string,                   // max 2000 chars
  depositAccountId?: string         // if omitted, backend uses invoice's depositAccountId
}
```

**Response 200:** full invoice object (same shape as `GET /invoices/:id`) with updated `status`, `amountPaid`, `amountDue`.

```ts
{
  data: {
    id: string,
    status: 'SENT'|'PARTIALLY_PAID'|'PAID',   // recomputed by backend
    amountPaid: number,
    amountDue: number,
    payments: Array<{
      id: string,
      paymentDate: string,
      amount: number,
      paymentMethod?: string,
      referenceNumber?: string,
      notes?: string,
      createdAt: string
    }>,
    // ... full invoice fields
  }
}
```

> Backend also auto-generates a journal entry: Debit Bank (deposit account), Credit Accounts Receivable.

**Errors:**
- `400` `{ message: 'Amount exceeds outstanding balance' }` → inline error on amount field.
- `400` `{ message: 'Invalid payment date' }` → inline error on date field.
- `400` `{ message: 'Invoice is not in a payable status' }` → toast + pop (invoice must be SENT or PARTIALLY_PAID).
- `403` permission missing → permission-denied state.
- `409` `{ message: 'Invoice is voided' }` → toast + pop.

## 6. State & Data Flow

- One-shot mutation. No persistent cache.
- On success: invalidate `['invoices','detail', invoiceId]`, `['invoices','list']`, `['invoices','summary']`, `['banking','accounts']` (balance changed), `['reports','ar-aging']`, `['dashboard']`, `['audit-trail']`.
- **Quick-fill "Full":** sets amount = `amountDue`.
- **Quick-fill "Half":** sets amount = `Math.floor((amountDue / 2) * 100) / 100` (round down to 2 decimal places). Show helper "Half: {amount} — remaining balance will stay outstanding."

## 7. Offline Behavior

Submit blocked offline. Deposit account list shows from cache if warm.

## 8. Push Triggers

None inbound. After success, server may emit a push to other admins — handled by the notifications module independently.

## 9. Edge Cases & Validation

- **Amount > amountDue:** backend rejects with 400; also block client-side with helper text "Cannot exceed outstanding amount of {amountDue}."
- **Amount = 0:** disable Save button. Minimum is 0.01.
- **Future date:** disallow in date picker (max = today).
- **Zero amountDue:** entry is gated upstream (Detail hides action when `statusInfo.allowPayment === false`). Defensively, if reached: show "This invoice is already paid" state.
- **Currency mismatch:** if invoice currency differs from selected deposit account's currency, show banner "Payment will be converted at the invoice exchange rate ({rate}). Backend handles FX gain/loss."
- **paymentMethod enum is UPPERCASE:** send `CASH`, `CHECK`, `BANK_TRANSFER`, `CREDIT_CARD`, `OTHER` — not lowercase.
- **Double-tap protection:** debounce Record Payment button 500ms.
- **Reference number:** optional for all methods including CHECK. Placeholder suggests "Check #1234" for CHECK method.

## 10. Acceptance Criteria

- [ ] Screen opens with amount pre-filled to `amountDue`.
- [ ] Method picker defaults to "Other" when nothing selected; values sent as UPPERCASE to backend.
- [ ] "Full" quick-fill sets exact `amountDue`; "Half" rounds down.
- [ ] Amount > amountDue: client-side error shown, Save disabled.
- [ ] Date defaults to today; future dates blocked.
- [ ] Deposit account picker hidden when only 1 account; auto-selected silently.
- [ ] Successful submit shows confirmation animation and routes to detail with updated `amountDue` and new payment row in history.
- [ ] Backend errors (400, 409) surface as inline errors or toast without losing form data.
- [ ] Light + dark mockups implemented.
