# MOBILE_INVOICES_SEND

**Screen #:** 14 · **Area:** Sales — Invoices · **Route key:** `InvoiceSend`
**Design ref:** [Design Brief §3 — Screen 14](../MOBILE_APP_DESIGN_BRIEF.md#screen-14--send-invoice-sheet)
**Index ref:** [Master Index §4.3](../MOBILE_APP_SCREENS_INDEX.md#43-sales--invoices-6-screens)

---

## 1. Screen Purpose

Confirm sending an invoice to the customer. The backend sends the email automatically using the customer's email on file with a default template — there is no recipient or message customization in v1. This is a lightweight confirmation step, not a compose sheet.

> **v1 scope note:** `POST /invoices/:id/send` accepts **no request body**. Email recipient, subject, and message are handled server-side using the customer's stored email and company email template. Customization (CC, BCC, subject override) is a v2 feature pending a backend body param addition.

## 2. Wireframe Description

Bottom sheet, ~50% snap (short sheet — confirmation only).

1. **Header:** "Send Invoice" + drag handle.
2. **Invoice summary card** (read-only):
   - Invoice number (e.g. `INV-0042`)
   - Customer name
   - Total amount + currency
   - Due date
3. **Recipient display row** (read-only, not editable):
   - Label "Sending to:"
   - Customer email (from invoice detail cache)
   - If no email on file: warning banner "No email on file for this customer." + disabled Send button + helper "Add an email address on the web app first."
4. **"Send Now" primary button** — full-width.
5. **"Cancel" ghost button** below.

After tapping Send: button shows spinner → on success sheet animates out → toast on detail "Invoice sent".

## 3. Component Breakdown

| Component | Props / State |
|-----------|---------------|
| `BottomSheet` | snapPoints=['50%'] |
| `InvoiceSummaryCard` | invoiceNumber, customerName, totalAmount, currencyCode, dueDate |
| `RecipientRow` | email (read-only display) |
| `NoEmailWarningBanner` | shown when customer.email is null/empty |
| `Button` ("Send Now") | loading, disabled when no email on file |
| `Button` ("Cancel") | ghost |

State owned: `submitting`, `serverError`.

## 4. Navigation

- **Entry:** `InvoiceDetail` Send action with `{ invoiceId }`. Data (customer email, invoice summary) sourced from the already-cached `['invoices','detail', id]`.
- **Exit:**
  - Send success → pop sheet; detail screen shows updated status SENT via cache invalidation.
  - Cancel / drag down → pop without action.

> **List swipe path:** the "Mark Sent" swipe action on `InvoiceList` fires `POST /invoices/:id/send` inline without opening this sheet. This sheet is only for the Detail → Send flow.

## 5. Backend Integration

**Permission required:** `invoice:send`.

### 5.1 Send invoice
**Endpoint:** `POST /api/v1/invoices/:id/send`
**Body:** none
**Response 200:** full invoice object with `status: 'SENT'`, `sentAt` populated.

```ts
{
  data: {
    id: string,
    invoiceNumber: string,
    status: 'SENT',
    sentAt: string,
    // ... full invoice shape (same as GET /invoices/:id)
  }
}
```

**Errors:**
- `400` `{ message: 'Invoice is not in DRAFT status' }` → toast. (Should not reach here if entry is gated by `statusInfo.allowSend`.)
- `400` `{ message: 'Insufficient stock...' }` → toast with item name. Invoice was not sent.
- `400` customer has no email → this is a client-side guard (check `customer.email` from cache before opening the sheet). If reached server-side, show toast with backend message.
- `502` upstream email failure → toast "Couldn't send the email. Invoice status updated — try resending from detail."

### 5.2 Pre-send guard (client-side, before opening sheet)
Before navigating to this sheet, check from the cached invoice detail:
1. `statusInfo.allowSend === true` — if false, do not open sheet.
2. `customer.email` is non-null and non-empty — if missing, open sheet but show warning + disabled Send.

## 6. State & Data Flow

- One-shot mutation. No cache reads on this screen (all data passed via navigation params or sourced from parent's cache).
- On success: invalidate `['invoices','detail', id]`, `['invoices','list']`, `['invoices','summary']`, `['audit-trail']`.

## 7. Offline Behavior

Submit blocked offline. Toast "You're offline. Try again when connected."

## 8. Push Triggers

None.

## 9. Edge Cases & Validation

- **No customer email:** show warning in sheet; disable Send button; show helper "Add an email address on the web app first."
- **Recurring invoice:** before opening sheet, if `isRecurring === true`, show an additional inline note in the summary card: "Sending will create the next occurrence on {nextRecurringDate}."
- **Already sent (SENT status):** `statusInfo.allowSend` will be false — Do not open this sheet. The send action should be hidden on Detail for non-DRAFT invoices.
- **Email delivery failure (502):** invoice status is still updated to SENT by the backend even if the email fails to deliver. Surface the error but do not block the user — they can resend from detail.
- **Permission missing:** entry is gated by `invoice:send` permission check on Detail. If somehow reached, show permission-denied state.

## 10. Acceptance Criteria

- [ ] Sheet opens with invoice summary and customer email displayed (read-only).
- [ ] If no customer email on file: warning shown, Send disabled, helper text visible.
- [ ] Recurring invoice: "next occurrence" note shown in summary.
- [ ] Tapping Send fires `POST /invoices/:id/send` with no body.
- [ ] On success: sheet closes, detail status updates to SENT, `sentAt` populated.
- [ ] On 502 email failure: toast shown, invoice still marked SENT.
- [ ] Cancel/drag-down closes without any API call.
- [ ] Light + dark mockups implemented.
