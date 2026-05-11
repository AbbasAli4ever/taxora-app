# MOBILE_CUSTOMERS_QUICK_ADD

**Screen #:** 22 · **Area:** Sales — Customers · **Route key:** `CustomerForm`
**Design ref:** [Design Brief §5 — Screen 22](../MOBILE_APP_DESIGN_BRIEF.md#screen-22--customer-quick-add)
**Index ref:** [Master Index §4.5](../MOBILE_APP_SCREENS_INDEX.md#45-sales--customers-3-screens)

---

## 1. Screen Purpose

Inline create (and edit) of a customer with the minimum fields needed to start invoicing them. Long-form admin (full address, classes, custom fields) is web-only in v1; this sheet is the on-the-go entry path that returns the new customer to the calling form.

## 2. Wireframe Description

Bottom sheet, 80% snap (full-screen on small phones).

1. **Title:** "New Customer" (or "Edit Customer").
2. **Type segmented control:** Individual · Business (defaults to Business).
3. **Display Name** (required, prominent). For Business: company name doubles as displayName.
4. **First / Last Name** (Individual only).
5. **Email** (validated).
6. **Phone** (formatted).
7. **Preferred Currency** picker (defaults to company base).
8. **Collapsible "More fields":** mobile, website, billing address (one-line auto-complete via OS), shipping address ("Same as billing" toggle), payment terms (text, e.g. "Net 30"), notes.
9. **Sticky footer:** "Cancel" ghost + "Save" primary.

Edit-mode adds a destructive "Deactivate customer" button at the bottom of "More fields" (gated by permission).

## 3. Component Breakdown

| Component | Props / State |
|-----------|---------------|
| `BottomSheet` | snapPoints=['80%','100%'] |
| `SegmentedControl` (type) | options=['Individual','Business'] |
| `TextInput` × N | controlled |
| `EmailInput` | with format validation |
| `PhoneInput` | with locale formatting |
| `CurrencyPicker` | from cached `/currencies` |
| `Collapsible` ("More fields") | |
| `AddressInput` | one-line autocomplete (OS) → expands |
| `Toggle` (sameAsBilling) | |
| `Button` (sticky) | "Save", loading |
| `DestructiveButton` (edit only) | "Deactivate customer" |

State owned (RHF):
```ts
{
  customerType: 'Individual' | 'Business',
  displayName: string,                  // required
  companyName?: string,
  firstName?: string,
  lastName?: string,
  email?: string,
  phone?: string,
  mobile?: string,
  website?: string,
  billingAddressLine1?: string,
  billingAddressLine2?: string,
  billingCity?: string,
  billingState?: string,
  billingPostalCode?: string,
  billingCountry?: string,              // 2-char ISO country code, max 2 chars
  shippingSameAsBilling: boolean,
  shippingAddressLine1?: string,
  /* …shipping fields */
  preferredCurrency?: string,           // 3-char ISO currency code
  paymentTerms?: string,               // text field, e.g. "Net 30", "Due on Receipt"
  notes?: string
}
```

## 4. Navigation

- **Entry contexts:**
  - **Quick-add from CustomerList** — adds standalone, refreshes list.
  - **Inline picker create** — invoked from InvoiceForm/EstimateForm/Bill picker; on save, returns the new customer to the caller.
  - **Edit** from CustomerDetail — same form, `mode=edit` with `id`.
- **Exit:**
  - Save (create) → close + return new customer payload to caller; refresh list cache.
  - Save (edit) → close + refresh CustomerDetail.
  - Cancel / drag-down → discard prompt if dirty.
  - Deactivate (edit) → confirm sheet → API call → close and pop CustomerDetail.

## 5. Backend Integration

**Permissions:** `customer:create` (create), `customer:edit` (edit), `customer:delete` (deactivate).

### 5.1 Create
**Endpoint:** `POST /api/v1/customers`
**Body** (per `CreateCustomerDto`):
```ts
{
  customerType?: 'Individual' | 'Business',  // default: 'Business'
  displayName: string,                         // required
  companyName?: string,
  firstName?: string,
  lastName?: string,
  middleName?: string,
  title?: string,
  suffix?: string,
  email?: string,
  phone?: string,
  mobile?: string,
  fax?: string,
  website?: string,
  billingAddressLine1?: string,
  billingAddressLine2?: string,
  billingCity?: string,
  billingState?: string,
  billingPostalCode?: string,
  billingCountry?: string,              // max 2 chars (ISO country code)
  shippingAddressLine1?: string,
  shippingAddressLine2?: string,
  shippingCity?: string,
  shippingState?: string,
  shippingPostalCode?: string,
  shippingCountry?: string,             // max 2 chars
  preferredCurrency?: string,           // 3-char code
  paymentTerms?: string,               // text, e.g. "Net 30" — NOT a number
  taxNumber?: string,
  taxExempt?: boolean,
  openingBalance?: number,
  creditLimit?: number,
  notes?: string
}
```

**Response 200** (NOT 201):
```ts
{
  success: true,
  message: 'Customer created successfully',
  data: {
    id: string,
    customerType: string,
    displayName: string,
    companyName: string | null,
    firstName: string | null,
    lastName: string | null,
    // … all fields …
    billingAddress: {
      line1: string | null,
      line2: string | null,
      city: string | null,
      state: string | null,
      postalCode: string | null,
      country: string | null
    },
    shippingAddress: { /* same shape */ },
    paymentTerms: string | null,
    currentBalance: number,
    isActive: boolean,
    createdAt: string,
    updatedAt: string
  }
}
```

> **Note:** Response returns nested `billingAddress` / `shippingAddress` objects even though the request body uses flat field names (`billingAddressLine1`, etc.).

**Errors:**
- `400` validation → map fields back via RHF `setError`.
- `409` `{ message: 'A customer with email "<email>" already exists' }` → inline error on email field.

### 5.2 Update
**Endpoint:** `PATCH /api/v1/customers/:id`
**Body:** any subset of create fields (same flat field names as the create body).
**Response 200:** same full customer shape as create.

### 5.3 Deactivate (edit mode only)
**Endpoint:** `DELETE /api/v1/customers/:id`
**Behavior:** Soft delete — sets `isActive = false`. Customer is NOT permanently deleted.
**Response 200:**
```ts
{ success: true, message: 'Customer deactivated successfully', data: null }
```

> **No open-invoice constraint** — the backend does not block deactivation if the customer has open invoices. No `400` error to handle here. On success, invalidate `['customers','list']` and pop to the previous screen.

### 5.4 Currency picker source
**Endpoint:** `GET /api/v1/currencies` (perm `currency:view`).
Cache `staleTime: 5min`.

## 6. State & Data Flow

- One-shot mutation. No persistent cache.
- Cross-screen invalidation on success: `['customers','list']` (all variants), and `['customers','detail', id]` for edits.
- "Same as billing" toggle copies billing fields to shipping on toggle-on; user can still edit afterwards (toggle does not lock).

## 7. Offline Behavior

Submit blocked offline. Currency list serves from cache.

## 8. Push Triggers

None.

## 9. Edge Cases & Validation

- **Required:** `displayName`. Auto-fill from `companyName` (Business) or `firstName + lastName` (Individual) when those fields blur, only if user hasn't typed displayName themselves.
- **Email format** validated client + server.
- **Phone formatting:** lenient — server stores raw; client formats for display.
- **`billingCountry`:** 2-char ISO code (e.g. "US", "IN"). Validate max 2 chars client-side.
- **`paymentTerms`:** free-text string (e.g. "Net 30", "Due on Receipt", "Net 15"). NOT a number of days.
- **Email uniqueness:** 409 conflict if another customer already has the same email. Map to inline email field error.
- **Discard prompt** when dirty on cancel/back.
- **Picker mode caller** receives the created customer payload (`{ id, displayName }`) and pre-fills its picker.

## 10. Acceptance Criteria

- [ ] Sheet opens with sensible defaults (type=Business, currency=base).
- [ ] Required validation on displayName.
- [ ] `paymentTerms` is a text field (not a number spinner).
- [ ] Save creates customer (response 200) and returns it to caller (picker mode) or refreshes list.
- [ ] Edit mode loads existing values; saving updates without losing scroll position.
- [ ] Deactivate (edit) requires confirm → soft-deactivates → pops screen.
- [ ] Email conflict 409 shows inline error on email field.
- [ ] Discard prompt appears on dirty cancel.
- [ ] Light + dark mockups implemented.
