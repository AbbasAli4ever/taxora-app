# MOBILE_VENDORS_LIST

**Screen #:** 34 · **Area:** Expenses — Vendors · **Route key:** `VendorList`
**Design ref:** [Design Brief §8 — Screen 34](../MOBILE_APP_DESIGN_BRIEF.md#screens-3436--vendor-list--detail--quick-add)
**Index ref:** [Master Index §4.8](../MOBILE_APP_SCREENS_INDEX.md#48-expenses--vendors-3-screens)

---

## 1. Screen Purpose

Searchable, alphabetized list of vendors. Shows AP balance (`currentBalance`) per row at a glance. Mirrors [CustomerList](./MOBILE_CUSTOMERS_LIST.md) — same shell, vendor entity, vendor-specific permissions and balance semantics.

## 2. Wireframe Description

Identical layout to [CustomerList §2](./MOBILE_CUSTOMERS_LIST.md#2-wireframe-description) with these substitutions:
- Title "Vendors" + count subtitle.
- Trailing `currentBalance` in muted color when > 0 (AP is an obligation, not a problem — not danger color). Hidden when 0.
- Quick "+" header button → [`VendorForm`](./MOBILE_VENDORS_QUICK_ADD.md).

## 3. Component Breakdown

Same as CustomerList; substitute `VendorRow` for `CustomerRow`.

State owned: `searchQuery`, `sortBy`, `refreshing`, `pickerMode`, `selectedId`.

## 4. Navigation

- **Entry:**
  - Expenses tab segmented swap → VendorList.
  - From `BillForm` / `ExpenseForm` / `ReceiptOCRConfirm` as picker (mode=picker, see [VendorPicker](./MOBILE_BILLS_VENDOR_PICKER.md)).
- **Exit:**
  - Tap row (browse) → `VendorDetail` with `{ id }`.
  - Picker mode → return selection to caller.
  - "+" → `VendorForm` quick-add.
  - Long-press row → action sheet (Call · Email · Edit).

## 5. Backend Integration

**Permission required:** `vendor:view`.

### 5.1 List vendors
**Endpoint:** `GET /api/v1/vendors`

> **No pagination** — the backend returns all matching vendors in a single array. There are no `page`, `limit`, `totalPages`, or `totalItems` params. Use client-side `FlashList` virtualization.

**Query params** (per `QueryVendorsDto`):
```ts
{
  search?: string,               // searches displayName, companyName, firstName, lastName, email, phone
  vendorType?: 'Business' | 'Individual',
  sortBy?: 'displayName' | 'email' | 'currentBalance' | 'createdAt',  // default: 'displayName'
  sortOrder?: 'asc' | 'desc',   // default: 'asc'
  isActive?: boolean,
  track1099?: boolean
}
```

**Response 200:** full array — see [VendorPicker §5.1](./MOBILE_BILLS_VENDOR_PICKER.md#51-list-vendors) for the complete shape.

> Use `currentBalance` for the trailing balance. There is no `apBalance` field on vendor objects.

### 5.2 Errors
- `403` permission → denied state.

## 6. State & Data Flow

**Cache key:** `['vendors','list', { search, sortBy, sortOrder, isActive }]`, `staleTime: 60s`. Same key shape as VendorPicker — shared cache.

> Use `useQuery` (not `useInfiniteQuery`) — no server-side pagination.

Cross-screen invalidation:
- After `VendorForm` quick-add or update → invalidate `['vendors','list']`.
- After bills/payments mutations affecting this vendor → invalidate.

Alphabet sectioning client-side on `displayName[0].toUpperCase()`.

Search passes `search` param to server (debounced 300ms) — not client-side filtering.

## 7. Offline Behavior

Cached response renders. Client-side search across cached array works as fallback. "+ Quick-add" blocked offline.

## 8. Push Triggers

None directly.

## 9. Edge Cases & Validation

- **currentBalance display:** muted color when > 0, hidden when 0.
- **Empty state:** "No vendors yet" + "Add your first vendor" CTA.
- **Inactive filter:** hidden by default; a filter toggle can show inactive ones.
- **Permissions:** "+" hidden if user lacks `vendor:create`.

## 10. Acceptance Criteria

- [ ] Full list loads in one request (no pagination); FlashList virtualizes for performance.
- [ ] Alphabet scrollbar works.
- [ ] Search passes `search` param to server and updates without flicker.
- [ ] Pull-to-refresh refetches.
- [ ] `currentBalance` shows in muted color when > 0, hidden when 0.
- [ ] Picker mode returns selection and pops.
- [ ] Quick-add creates vendor and invalidates list.
- [ ] Light + dark mockups implemented.
