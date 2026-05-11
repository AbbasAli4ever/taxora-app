# MOBILE_VENDORS_QUICK_ADD

**Screen #:** 36 · **Area:** Expenses — Vendors · **Route key:** `VendorForm`
**Design ref:** [Design Brief §8 — Screen 36](../MOBILE_APP_DESIGN_BRIEF.md#screens-3436--vendor-list--detail--quick-add)
**Index ref:** [Master Index §4.8](../MOBILE_APP_SCREENS_INDEX.md#48-expenses--vendors-3-screens)

---

## 1. Screen Purpose

Inline create (and edit) of a vendor with the minimum fields needed to start billing them. Long-form admin (custom fields, full 1099 setup) is web-only in v1; this sheet is the fast on-the-go entry path that returns the new vendor to the calling form.

## 2. Wireframe Description

Identical pattern to [CustomerForm quick-add](./MOBILE_CUSTOMERS_QUICK_ADD.md), with these vendor-specific fields:

1. **Type segmented control:** Individual · Business (default Business).
2. **Display Name** (required).
3. **First / Last Name** (Individual only) or **Company Name** (Business).
4. **Email** (validated).
5. **Phone**.
6. **Preferred Currency** picker (defaults to company base).
7. **Payment Terms** — text field (e.g. "Net 30", "Due on Receipt"). NOT a number spinner.
8. **Collapsible "More fields":**
   - Mobile, website, address (one-line autocomplete).
   - **Tax Number** (`taxNumber`) — TIN / EIN.
   - **Business ID** (`businessIdNo`) — optional secondary ID.
   - **1099 vendor toggle** (`track1099`).
   - Notes.
9. **Sticky footer:** Cancel + Save.

Edit-mode adds a destructive "Deactivate vendor" button at the bottom of "More fields" (gated).

## 3. Component Breakdown

Same primitives as [CustomerForm](./MOBILE_CUSTOMERS_QUICK_ADD.md). Add `Toggle` (`track1099`) and `TextInput` (`taxNumber`, `businessIdNo`).

State owned (RHF):
```ts
{
  vendorType: 'Individual' | 'Business',
  displayName: string,                   // required
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
  addressLine1?: string,                 // NOT billingAddressLine1 — vendors have a single address
  addressLine2?: string,
  city?: string,
  state?: string,
  postalCode?: string,
  country?: string,                      // 2-char ISO code recommended
  preferredCurrency?: string,            // 3-char ISO code
  paymentTerms?: string,                // text, e.g. "Net 30" — NOT a number
  taxNumber?: string,                   // NOT taxId
  businessIdNo?: string,
  track1099?: boolean,                  // NOT is1099
  notes?: string
}
```

> **Vendor address is a single address** (not billing + shipping like customers). Request body uses flat field names: `addressLine1`, `addressLine2`, `city`, `state`, `postalCode`, `country`. The response returns them as a nested `address: { line1, line2, city, state, postalCode, country }` object.

## 4. Navigation

- **Entry contexts:**
  - **Quick-add from VendorList** → adds standalone, refreshes list.
  - **Inline picker create** from `VendorPicker`/`BillForm`/`ExpenseForm`/`ReceiptOCRConfirm` — on save, returns the new vendor to caller.
  - **Edit** from `VendorDetail` — same form, `mode=edit` with `id`.
- **Exit:**
  - Save (create) → close + return new vendor payload to caller; refresh list cache.
  - Save (edit) → close + refresh detail.
  - Cancel / drag-down → discard prompt if dirty.
  - Deactivate (edit) → confirm sheet → API call → close and pop detail.

## 5. Backend Integration

**Permissions:** `vendor:create` (create), `vendor:edit` (edit), `vendor:delete` (deactivate).

### 5.1 Create
**Endpoint:** `POST /api/v1/vendors`
**Body:**
```ts
{
  vendorType?: 'Individual' | 'Business',  // default: 'Business'
  displayName: string,                      // required
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
  addressLine1?: string,                    // flat, not nested
  addressLine2?: string,
  city?: string,
  state?: string,
  postalCode?: string,
  country?: string,
  preferredCurrency?: string,              // 3-char code
  paymentTerms?: string,                  // text field, e.g. "Net 30"
  taxNumber?: string,
  businessIdNo?: string,
  track1099?: boolean,
  openingBalance?: number,
  creditLimit?: number,
  notes?: string
}
```

**Response 200** (NOT 201):
```ts
{
  success: true,
  message: 'Vendor created successfully',
  data: {
    id: string,
    vendorType: string,
    displayName: string,
    // … all fields …
    address: {
      line1: string | null,
      line2: string | null,
      city: string | null,
      state: string | null,
      postalCode: string | null,
      country: string | null
    },
    taxNumber: string | null,
    businessIdNo: string | null,
    track1099: boolean,
    paymentTerms: string | null,
    currentBalance: number,
    isActive: boolean,
    createdAt: string,
    updatedAt: string
  }
}
```

**Errors:**
- `400` validation → map fields back via RHF `setError`.
- `409` `{ message: 'Vendor "<displayName>" already exists' }` → inline error on displayName.
- `409` `{ message: 'A vendor with email "<email>" already exists' }` → inline error on email.

### 5.2 Update
**Endpoint:** `PATCH /api/v1/vendors/:id`
**Body:** any subset of create fields (same flat field names).
**Response 200:** same full vendor shape as create.

### 5.3 Deactivate (edit only)
**Endpoint:** `DELETE /api/v1/vendors/:id`
**Behavior:** Soft delete — sets `isActive = false`. Vendor is NOT permanently deleted.
**Response 200:**
```ts
{ success: true, message: 'Vendor deactivated successfully', data: null }
```

> **No open-bills constraint** — the backend does not block deactivation if the vendor has open bills. On success, invalidate `['vendors','list']` and pop to previous screen.

### 5.4 Currency picker source
**Endpoint:** `GET /api/v1/currencies` (perm `currency:view`). Cache 5 min.

## 6. State & Data Flow

One-shot mutation. Cross-screen invalidation on success: `['vendors','list']` (all variants), `['vendors','detail', id]` for edits.

`displayName` autofill: from `companyName` (Business) or `firstName + lastName` (Individual) on blur, only if user hasn't typed it.

## 7. Offline Behavior

Submit blocked offline. Currency list serves from cache.

## 8. Push Triggers

None.

## 9. Edge Cases & Validation

- **Required:** `displayName`.
- **Email format** validated client + server.
- **Phone formatting** lenient on client; server stores raw.
- **`paymentTerms`:** free-text string — NOT a number. Show a text input, not a number spinner.
- **`track1099` toggle** makes `taxNumber` field prominent (UX hint) — backend accepts without it.
- **displayName conflict:** 409 → inline error on displayName.
- **Email conflict:** 409 → inline error on email.
- **Discard prompt** when dirty on cancel/back.
- **Picker mode caller** receives `{ id, displayName }` and pre-fills.
- **Permission gating:** Deactivate hidden without `vendor:delete`.

## 10. Acceptance Criteria

- [ ] Sheet opens with sensible defaults (type=Business, currency=base).
- [ ] Required validation on displayName.
- [ ] `paymentTerms` is a text field (not a number spinner).
- [ ] Save creates vendor (response 200) and returns it to caller.
- [ ] Edit mode loads existing values; saving updates without losing scroll.
- [ ] Deactivate requires confirm → soft-deactivates → pops screen.
- [ ] displayName and email conflict 409 errors show inline on respective fields.
- [ ] Discard prompt on dirty cancel.
- [ ] Light + dark mockups implemented.
