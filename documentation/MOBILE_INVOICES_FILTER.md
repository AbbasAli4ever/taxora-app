# MOBILE_INVOICES_FILTER

**Screen #:** 11 · **Area:** Sales — Invoices · **Route key:** `InvoiceFilter`
**Design ref:** [Design Brief §3 — Screen 11](../MOBILE_APP_DESIGN_BRIEF.md#screen-11--invoice-filter-sheet)
**Index ref:** [Master Index §4.3](../MOBILE_APP_SCREENS_INDEX.md#43-sales--invoices-6-screens)

---

## 1. Screen Purpose

Compose advanced filters for the invoice list — multi-status, date range, customer, amount range — that the segmented control on the list cannot express. Returns the filter object to `InvoiceList` on apply.

## 2. Wireframe Description

Bottom sheet, 90% snap. Drag handle on top. Header: "Filters" centered, "Reset" link top-right (clears all to defaults).

Sections, each separated by 24px:

1. **Status** — multi-select chip group: Draft · Sent · Partially Paid · Paid · Overdue · Void.
2. **Date Range** — preset chips: This Week · This Month · Last Month · This Quarter · YTD · Custom. Tapping Custom expands an inline `from` / `to` date picker pair.
3. **Customer** — single-row tappable that opens a `CustomerPicker` modal; shows selected customer name (or "Any customer").
4. **Amount Range** — dual slider with min/max numeric inputs synced to slider thumbs. *(Client-side filter only — see note in §5.)*
5. **Class / Department** (collapsed by default; expand if user has multiple classes/departments configured).

Sticky footer: full-width Primary "Apply Filters" button. Tapping outside or dragging down closes without applying.

## 3. Component Breakdown

| Component | Props / State |
|-----------|---------------|
| `BottomSheet` | snapPoints=['90%'], onDismiss |
| `ChipMultiSelect` (status) | options, value[], onChange |
| `DateRangePresetPicker` | preset value, onChange |
| `DateField` × 2 | for Custom range |
| `RowPicker` (customer) | label, value, onPress |
| `AmountRangeSlider` | min, max, value=[lo, hi], onChange |
| `Button` (sticky footer) | "Apply Filters" |
| `TextLink` ("Reset") | onPress → reset to defaults |

State owned (controlled draft, not committed until Apply):
```ts
{
  statuses: string[],
  datePreset: 'this_week'|'this_month'|'last_month'|'this_quarter'|'ytd'|'custom',
  dateFrom?: string,
  dateTo?: string,
  customerId?: string,
  amountMin?: number,
  amountMax?: number,
  classId?: string,
  departmentId?: string
}
```

## 4. Navigation

- **Entry:** `InvoiceList` filter funnel icon.
- **Exit:**
  - Apply → pop with filter result; `InvoiceList` consumes via param/route ref or shared Zustand slice.
  - Drag-down / tap outside → pop without applying.
  - Customer row tap → `CustomerPicker` modal stacked on top of this sheet.

## 5. Backend Integration

This sheet itself **does not call any list endpoints** — it only composes a query object. The `InvoiceList` consumes the result and re-fetches.

### 5.1 Customer picker (sub-modal)
**Endpoint:** `GET /api/v1/customers?search=<q>&limit=20`
**Permission:** `customer:view`.
**Response:** standard customer list — only `{ id, displayName }` is needed here.

### 5.2 Statuses for chip labels
Reuse cached `GET /api/v1/invoices/statuses` from List screen.

### 5.3 Class / Department (mount check)
**Endpoints:** `GET /api/v1/classes`, `GET /api/v1/departments`
Hide both sections if both return empty arrays.

### 5.4 Result shape returned to InvoiceList

The sheet maps draft state → `QueryInvoicesDto`-compatible object. Because `status` is a **single enum value** in the backend, multi-status selections are handled as follows:

```ts
{
  // If user selected exactly 1 status → pass as single status param
  // If user selected 2+ statuses → InvoiceList issues one request per
  // selected status in parallel and merges + sorts results client-side
  statuses: string[],          // kept as array in Zustand; InvoiceList decides how to query

  dateFrom?: string,           // YYYY-MM-DD — passed to backend as dateFrom
  dateTo?: string,             // YYYY-MM-DD — passed to backend as dateTo
  customerId?: string,         // passed to backend
  classId?: string,            // passed to backend
  departmentId?: string,       // passed to backend

  // amountMin / amountMax: NOT sent to backend (QueryInvoicesDto does not support them)
  // InvoiceList applies these as a client-side post-fetch filter on loaded results
  amountMin?: number,
  amountMax?: number
}
```

> **Important:** `amountMin` / `amountMax` are **client-side only**. The backend `QueryInvoicesDto` has no amount range params. InvoiceList filters the already-fetched page data by these values after receiving results.

## 6. State & Data Flow

- Draft state owned by sheet; only committed to the parent's filter store on Apply.
- Reset reverts to `{}` (no filters; segmented control on list takes over).
- Changing date preset auto-fills `dateFrom`/`dateTo` for non-custom presets so the parent doesn't recompute.

## 7. Offline Behavior

- Customer picker cannot search while offline; show inline message in picker modal.
- The filter sheet itself remains usable for offline-cached criteria (status, date preset, amount range).

## 8. Push Triggers

None.

## 9. Edge Cases & Validation

- **Date range validation:** if user picks Custom and `dateFrom > dateTo`, disable Apply with helper text.
- **Amount range:** if min > max, swap on commit.
- **Reset** must clear inline picker selections (customer name display reverts to "Any customer").
- **Class / Department** sections are hidden if the company has none configured.
- **Persistence:** the active filter set is held in a Zustand slice tied to InvoiceList — survives screen blur but not app cold start (intentional).

## 10. Acceptance Criteria

- [ ] Sheet opens with current parent filter pre-populated.
- [ ] Multi-select chips toggle correctly.
- [ ] Date presets compute `from`/`to`; Custom shows date pickers.
- [ ] Custom date range with from > to disables Apply.
- [ ] Customer picker selects and displays the chosen customer.
- [ ] Amount range slider + numeric inputs stay in sync.
- [ ] Reset clears every section.
- [ ] Apply pops the sheet and the list refetches with new filters.
- [ ] Drag-down dismisses without applying.
- [ ] Class/Department sections hidden when none configured.
- [ ] Light + dark mockups implemented.
