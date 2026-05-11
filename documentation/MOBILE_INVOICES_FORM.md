# MOBILE_INVOICES_FORM

**Screen #:** 13 · **Area:** Sales — Invoices · **Route key:** `InvoiceForm`
**Design ref:** [Design Brief §3 — Screen 13](../MOBILE_APP_DESIGN_BRIEF.md#screen-13--invoice-create--edit)
**Index ref:** [Master Index §4.3](../MOBILE_APP_SCREENS_INDEX.md#43-sales--invoices-6-screens)

---

## 1. Screen Purpose

Create or edit an invoice with line items, taxes, discounts, project linkage, and recurring settings. Same screen, two modes (`create` and `edit`); also reused for `duplicate` (create mode prefilled from another invoice).

## 2. Wireframe Description

Long form, scrollable, with a sticky bottom footer.

1. **Customer picker** (large tap target). Shows selected customer name + email, or "Select customer" placeholder. Tap → CustomerPicker modal.
2. **Top fields row:** Invoice # (auto-filled, editable), Issue Date, Due Date.
3. **Payment Terms picker** (optional): DUE_ON_RECEIPT · NET_10 · NET_15 · NET_30 · NET_45 · NET_60 · NET_90 · CUSTOM. If set, Due Date is auto-computed from Issue Date.
4. **Reference Number** input (optional, up to 100 chars).
5. **Line Items section:**
   - Each line is a card with: Product picker (or free-text description), Quantity, Unit Price, Tax Rate picker (or manual Tax %), Discount %, line amount (computed).
   - Trailing per-line trash icon; long-press to drag-reorder.
   - "+ Add Line" button below the last card.
6. **Invoice-level Discount** (optional): Type toggle PERCENTAGE / FIXED + value input. Applied after line item subtotals.
7. **Totals card** (read-only, live-updating): Subtotal, Discount, Tax (per rate breakdown), **Total**.
8. **Advanced (collapsible):**
   - Currency picker (defaults to customer's preferred or company base).
   - Deposit Account picker (default payment routing account).
   - Project picker.
   - Class / Department pickers (if configured).
   - Notes (textarea, max 2000 chars).
   - Terms & Conditions (textarea, max 5000 chars).
   - Recurring toggle → frequency + end-date pickers when enabled.
9. **Sticky footer bar:** running Total, two buttons — "Save Draft" (secondary) and "Save & Send" (primary).

Edit mode swaps "Save Draft" → "Save Changes" and removes "Save & Send".

## 3. Component Breakdown

| Component | Props / State |
|-----------|---------------|
| `CustomerPickerInline` | value, onPress |
| `TextInput` (invoice #) | controlled, with regenerate button |
| `DateField` × 2 | invoiceDate, dueDate |
| `PaymentTermsPicker` | value, onChange |
| `TextInput` (reference #) | value, onChange, max 100 |
| `LineItemCard` | bound to RHF field array |
| `ProductPickerInline` | value, onChange (autocompletes) |
| `AddLineButton` | onPress → append line |
| `DiscountRow` | discountType toggle + discountValue input |
| `TotalsCard` | reactive to lineItems + discount via RHF watch |
| `Collapsible` ("Advanced") | |
| `CurrencyPicker` | code, onChange |
| `DepositAccountPicker` | id, onChange |
| `ProjectPicker` | id, onChange |
| `Toggle` (recurring) | + freq + endDate |
| `StickyFormFooter` | total + 2 buttons |

State owned (RHF):
```ts
{
  customerId: string,                  // required
  invoiceNumber?: string,              // auto-filled; editable
  referenceNumber?: string,
  invoiceDate: string,                 // required, YYYY-MM-DD
  dueDate?: string,                    // YYYY-MM-DD
  paymentTerms?: 'DUE_ON_RECEIPT'|'NET_10'|'NET_15'|'NET_30'|'NET_45'|'NET_60'|'NET_90'|'CUSTOM',
  currencyCode?: string,               // defaults to company base
  exchangeRate?: number,
  depositAccountId?: string,
  projectId?: string,
  classId?: string,
  departmentId?: string,
  discountType?: 'PERCENTAGE'|'FIXED',
  discountValue?: number,
  lineItems: Array<{                   // min 1 required
    productId?: string,
    description: string,               // required
    quantity: number,                  // required, > 0
    unitPrice: number,                 // required, >= 0
    discountPercent?: number,
    taxPercent?: number,
    taxRateId?: string,
    sortOrder?: number,
    classId?: string,
    departmentId?: string
  }>,
  notes?: string,                      // max 2000 chars
  termsAndConditions?: string,         // max 5000 chars — NOT 'terms'
  isRecurring?: boolean,
  recurringFrequency?: 'DAILY'|'WEEKLY'|'BIWEEKLY'|'MONTHLY'|'QUARTERLY'|'YEARLY',
  recurringEndDate?: string
}
```

## 4. Navigation

- **Entry:**
  - `InvoiceList` FAB → mode=create.
  - `InvoiceDetail` Edit → mode=edit, params `{ id }`.
  - `InvoiceDetail` Duplicate → mode=create, params `{ prefillFromId }`.
  - `EstimateConvert` → mode=create, params `{ prefillFromEstimateId }`.
- **Exit:**
  - Save Draft → POST/PATCH → pop to `InvoiceDetail` (new id) with toast "Draft saved".
  - Save & Send → POST then immediately POST send → pop to detail with "Sent" toast.
  - Save Changes (edit) → PATCH → pop to detail with toast.
  - Back with unsaved changes → prompt sheet "Discard changes?".

## 5. Backend Integration

**Permissions:** `invoice:create` (create mode) or `invoice:edit` (edit mode). Save & Send additionally requires `invoice:send`.

> **Edit restriction:** Only DRAFT invoices can be edited. The backend rejects PATCH on any other status. In edit mode, check `statusInfo.allowEdit` from the cached detail — if false, show a read-only view instead of the form.

### 5.1 Next number (create mode)
**Endpoint:** `GET /api/v1/invoices/next-number`
**Permission:** `invoice:create`
**Response 200:** `{ data: { nextInvoiceNumber: 'INV-0042' } }`
> Field is `nextInvoiceNumber` (not `invoiceNumber`). Auto-fill on mount; user can still edit.

### 5.2 Get invoice (edit / duplicate mode)
**Endpoint:** `GET /api/v1/invoices/:id`
Map response into form state. For Duplicate: omit `id`, call next-number for a fresh `invoiceNumber`, reset `invoiceDate` to today, clear `payments`, `status`, `sentAt`, `paidAt`, `voidedAt`.

### 5.3 Customer picker
**Endpoint:** `GET /api/v1/customers?search=&limit=20` (perm `customer:view`).
"+ New customer" inline → opens `CustomerForm` bottom sheet.

### 5.4 Product picker
**Endpoint:** `GET /api/v1/products?search=&limit=20` (perm `product:view`).
On select: autofill `description`, `unitPrice`, default `taxRateId`.

> **Inventory warning:** products with `type=INVENTORY` and `trackInventory=true` will have stock deducted when the invoice is sent. If stock is insufficient at send time, the backend throws 400. Show a warning badge on inventory-type line items: "Stock: {qtyOnHand} available".

### 5.5 Tax rates
**Endpoint:** `GET /api/v1/taxes/rates` (perm `tax:view`).
Only rates with `type=SALES` or `type=BOTH` are valid for invoices. Cache `staleTime: 5min`.

### 5.6 Currencies
**Endpoint:** `GET /api/v1/currencies` (perm `currency:view`).
On currency change away from base: autofill `exchangeRate` from `GET /api/v1/currencies/exchange-rates/latest?from=<code>&to=<base>`. Allow manual override.

### 5.7 Deposit account picker
**Endpoint:** `GET /api/v1/banking/accounts` (perm `bank_account:view`).
Pre-select the account flagged as default or the first bank account in base currency.

### 5.8 Project picker
**Endpoint:** `GET /api/v1/projects?status=ACTIVE&search=&limit=20` (perm `project:view`).

### 5.9 Class / Department
`GET /api/v1/classes` and `GET /api/v1/departments`. Hide pickers if both return empty arrays.

### 5.10 Create
**Endpoint:** `POST /api/v1/invoices`
**Permission:** `invoice:create`
**Body** (per `CreateInvoiceDto`):
```ts
{
  customerId: string,               // required
  invoiceNumber?: string,           // optional; auto-generated if omitted
  referenceNumber?: string,
  invoiceDate: string,              // required, YYYY-MM-DD
  dueDate?: string,
  paymentTerms?: string,
  currencyCode?: string,
  exchangeRate?: number,
  depositAccountId?: string,
  projectId?: string,
  classId?: string,
  departmentId?: string,
  discountType?: 'PERCENTAGE'|'FIXED',
  discountValue?: number,
  lineItems: Array<{                // min 1 required
    productId?: string,
    description: string,
    quantity: number,
    unitPrice: number,
    discountPercent?: number,
    taxPercent?: number,
    taxRateId?: string,
    sortOrder?: number,
    classId?: string,
    departmentId?: string
  }>,
  notes?: string,
  termsAndConditions?: string,      // NOT 'terms'
  isRecurring?: boolean,
  recurringFrequency?: string,
  recurringEndDate?: string
}
```
**Response 201:** full invoice object (same shape as GET /invoices/:id).

### 5.11 Update
**Endpoint:** `PATCH /api/v1/invoices/:id`
**Permission:** `invoice:edit`
**Body:** any subset of create fields (all optional).
**Restriction:** only DRAFT invoices accepted — backend returns 400 on any other status.

### 5.12 Save & Send (post-create chain)
After create response (201), immediately call `POST /api/v1/invoices/:id/send` (perm `invoice:send`). Send takes **no body**.
- If send fails: invoice is created as DRAFT; show toast "Saved as draft — couldn't send. Try again from detail."

### 5.13 Errors
- `400` validation → map error fields back to RHF `setError`. Scroll to first error.
- `400` "Insufficient stock" → toast with item name; do not pop the form.
- `403` → permission-denied banner pre-mount.
- `409` (duplicate invoice number) → inline error on invoice number field.

## 6. State & Data Flow

- **No list cache writes from form**; rely on invalidation after success.
- **Live totals computation** from RHF `useWatch` on `lineItems` + `discountType` + `discountValue`. Debounce 100ms.
- **Pre-fill rules for duplicate:** copy `lineItems`, `customerId`, `termsAndConditions`, `notes`, `discountType`, `discountValue`; regenerate `invoiceNumber`; reset `invoiceDate` to today; clear `dueDate`, `payments`, `status`.
- **Unsaved-changes guard:** track RHF `isDirty`; intercept back gesture to confirm discard.

## 7. Offline Behavior

- Pickers require network for first load — show cached lists if available.
- Save blocked offline with toast.
- Form itself is fully usable offline once picker caches are warm — user can compose, but submit requires network.

## 8. Push Triggers

None.

## 9. Edge Cases & Validation

- **Date sanity:** `dueDate` ≥ `invoiceDate`.
- **Empty line items:** disable Save with helper "Add at least one line item".
- **Tax mode per line:** `taxRateId` takes precedence over `taxPercent`. Picking a rate disables the manual percent field (rate's percent shown read-only).
- **Invoice-level discount:** applies after sum of line item subtotals. Show discount amount in totals card.
- **`recurringFrequency` options:** DAILY, WEEKLY, **BIWEEKLY**, MONTHLY, QUARTERLY, YEARLY — note `BIWEEKLY` exists.
- **Recurring + Save & Send:** only the first occurrence is sent; next occurrence is auto-cloned as DRAFT by the backend.
- **Edit on non-DRAFT invoice:** check `statusInfo.allowEdit`. If false, navigate to detail instead of form.
- **Long forms / keyboard:** focused input always visible above keyboard; sticky footer rises above keyboard on Android.

## 10. Acceptance Criteria

- [ ] Create from FAB lands with auto-filled `nextInvoiceNumber` (from correct response field) and today's `invoiceDate`.
- [ ] Adding/removing line items updates live totals correctly (with per-line tax + invoice-level discount).
- [ ] `paymentTerms` picker auto-computes `dueDate` from `invoiceDate`.
- [ ] Save Draft persists invoice in DRAFT status and routes to detail.
- [ ] Save & Send creates and sends; detail shows status SENT.
- [ ] Edit mode loads existing DRAFT invoice into form; saving updates without losing line items.
- [ ] Duplicate prefills correctly with new number/date.
- [ ] `termsAndConditions` field submitted and retrieved correctly (not `terms`).
- [ ] Discard prompt appears when backing out with unsaved changes.
- [ ] Inventory product shows stock badge; send with insufficient stock shows error toast.
- [ ] Permissions hide Save & Send when user lacks `invoice:send`.
- [ ] Light + dark mockups implemented.
