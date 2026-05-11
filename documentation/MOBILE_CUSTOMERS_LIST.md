# MOBILE_CUSTOMERS_LIST

**Screen #:** 20 · **Area:** Sales — Customers · **Route key:** `CustomerList`
**Design ref:** [Design Brief §5 — Screen 20](../MOBILE_APP_DESIGN_BRIEF.md#screen-20--customer-list)
**Index ref:** [Master Index §4.5](../MOBILE_APP_SCREENS_INDEX.md#45-sales--customers-3-screens)

---

## 1. Screen Purpose

Searchable, alphabetized list of customers. Shows current balance per row at a glance. Entry to detail and quick-add. Reused as a **picker modal** when invoked from forms (Invoice, Estimate, etc.).

## 2. Wireframe Description

1. **Header** — title "Customers" + count subtitle. Trailing: "+" icon (quick-add).
2. **Search bar** — debounced 300ms; searches displayName, companyName, firstName, lastName, email, phone.
3. **A–Z scrollbar** down the right edge with letter labels.
4. **Sectioned alphabetic list** with sticky letter headers ("A", "B", …).
5. **Row** (~64px): leading colored-initial avatar circle, displayName (one line), email or phone subtitle (one line), trailing `currentBalance` in danger color if > 0 (else hidden).
6. **FAB or trailing "+"** opens [`CustomerForm`](./MOBILE_CUSTOMERS_QUICK_ADD.md).

Pull-to-refresh. No server-side pagination — all customers are returned in one response; implement client-side virtualization with `FlashList`.

## 3. Component Breakdown

| Component | Props / State |
|-----------|---------------|
| `LargeTitleHeader` | title, subtitle, trailing |
| `SearchBar` | debounced |
| `AlphabetScrollBar` | active letter, onJump |
| `SectionList` | grouped by first letter of displayName |
| `CustomerRow` | id, displayName, subtitle, currentBalance |
| `FAB` (or "+" header button) | |
| `Skeleton`, `EmptyState` | |

State owned: `searchQuery`, `sortBy`, `refreshing`, `pickerMode`, `selectedId`.

## 4. Navigation

- **Entry:**
  - Sales tab segmented control → CustomerList.
  - From InvoiceForm / EstimateForm as a **picker modal** (mode=picker).
- **Exit:**
  - Tap row → `CustomerDetail` with `{ id }` (mode=browse) OR returns selection to caller (mode=picker).
  - "+" → `CustomerForm` quick-add.
  - Long-press row → action sheet (Call · Email · Edit).

## 5. Backend Integration

**Permission required:** `customer:view`.

### 5.1 List customers
**Endpoint:** `GET /api/v1/customers`
**Query params** (per `QueryCustomersDto`):
```ts
{
  search?: string,               // searches: displayName, companyName, firstName, lastName, email, phone
  customerType?: 'Business'|'Individual',
  isActive?: boolean,            // default: no filter (returns all). Pass true for active only
  sortBy?: 'displayName'|'email'|'currentBalance'|'createdAt',  // default: 'displayName'
  sortOrder?: 'asc'|'desc'       // default: 'asc'
}
```

> **No pagination** — the backend returns all matching customers in a single array. There are no `page`, `limit`, `totalPages`, or `totalItems` params. Use client-side `FlashList` virtualization to handle large lists.

**Response 200:**
```ts
{
  success: true,
  message: 'Customers retrieved successfully',
  data: Array<{
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
    paymentTerms: string | null,    // e.g. "Net 30" — NOT paymentTermsDays
    openingBalance: number,
    currentBalance: number,         // use this for the trailing balance — NOT arBalance
    creditLimit: number | null,
    notes: string | null,
    isActive: boolean,
    createdAt: string,
    updatedAt: string
  }>
}
```

> **No `arBalance` or `arAging` fields** on list items. Use `currentBalance` for the trailing balance display.

### 5.2 Errors
- `403` permission missing → permission-denied state.

## 6. State & Data Flow

**Cache key:** `['customers','list', { search, sortBy, sortOrder, isActive }]`, `staleTime: 60s`.

> Since there is no pagination, the entire filtered list is fetched in one request. Use React Query's standard `useQuery` (not `useInfiniteQuery`).

**Cross-screen invalidation:**
- After `CustomerForm` quick-add success → invalidate `['customers','list']`.
- After CustomerDetail edit → invalidate `['customers','list']` + `['customers','detail', id]`.

**Alphabet sectioning** computed client-side from `displayName[0].toUpperCase()`.

**Search** hits the server (pass `search` param) — not client-side filtering — so typing triggers a new request (debounced 300ms).

**Picker mode** suppresses navigation to detail; row tap returns `{ id, displayName }` to caller.

## 7. Offline Behavior

- Cached response renders. Client-side search across cached array works as fallback.
- Quick-add blocked offline.

## 8. Push Triggers

None.

## 9. Edge Cases & Validation

- **Empty list (new company):** illustration + "Add your first customer" CTA.
- **Permission gating:** "+" hidden if user lacks `customer:create`.
- **Balance display:** show `currentBalance` in danger color when > 0, hidden when 0. Balance is in company base currency.
- **Long names:** truncate with ellipsis to one line.
- **Avatar color:** stable hash of customer `id` → palette index.
- **Inactive customers:** include only active by default (pass `isActive=true`). A filter toggle can show inactive ones.
- **Picker mode header:** swap title to "Select a customer", add "Cancel" leading button.

## 10. Acceptance Criteria

- [ ] Full list loads in one request (no pagination); FlashList virtualizes for performance.
- [ ] Alphabet scrollbar jumps to correct section.
- [ ] Search passes `search` param to server and updates without flicker.
- [ ] Pull-to-refresh refetches.
- [ ] `currentBalance` shows in danger color when > 0, hidden when 0.
- [ ] Picker mode returns `{ id, displayName }` to caller and pops.
- [ ] Quick-add creates customer and invalidates list.
- [ ] Light + dark mockups implemented.
