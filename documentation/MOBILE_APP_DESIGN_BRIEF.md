# FinanX Mobile App — Design Brief

**Audience:** Design agent / UI designer
**Goal:** Produce production-ready UI for **66 screens** across iOS + Android using modern, finance-grade design.
**Reference scope:** See [MOBILE_APP_SCREENS_INDEX.md](./MOBILE_APP_SCREENS_INDEX.md) for the screen catalog and backend integration. This document is **design-only** — no API details.

---

## 0. Design System & Global Direction

### Design Language
- **Modern, fintech-clean** — think Revolut + Stripe Dashboard + Linear, not enterprise accounting.
- **Minimalist surfaces, expressive data.** Numbers and charts are the heroes; chrome stays quiet.
- **Generous whitespace.** No dense tables; use cards, sections, and hierarchy.
- **Soft shadows + 12–16px corner radii.** Avoid hard borders; use subtle dividers (`#E5E7EB` light / `#1F2937` dark).
- **Glassmorphism only sparingly** — bottom sheets and floating bars can use frosted blur on iOS.

### Color Palette
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `bg/primary` | `#FFFFFF` | `#0B0F17` | App background |
| `bg/elevated` | `#F8FAFC` | `#111827` | Card surfaces |
| `text/primary` | `#0F172A` | `#F1F5F9` | Body |
| `text/secondary` | `#64748B` | `#94A3B8` | Captions, labels |
| `accent/primary` | `#4F46E5` (Indigo 600) | `#6366F1` | Primary CTA, active tab |
| `accent/success` | `#16A34A` | `#22C55E` | Paid, approved, income |
| `accent/warning` | `#F59E0B` | `#FBBF24` | Overdue, pending |
| `accent/danger` | `#DC2626` | `#EF4444` | Void, rejected, expense |
| `accent/info` | `#0EA5E9` | `#38BDF8` | Draft, neutral statuses |
| `divider` | `#E5E7EB` | `#1F2937` | Dividers, borders |

> **Both light and dark mode are required day-one.** Every screen must look intentional in both.

### Typography
- **Font:** Inter (or SF Pro on iOS / Roboto on Android via system fallback).
- **Numerals:** tabular figures for all money + dates.
- Scale (mobile): `H1 28/34`, `H2 22/28`, `H3 18/24`, `Body 15/22`, `Caption 13/18`, `Tiny 11/16`. Weights: 400 / 500 / 600 / 700.

### Spacing & Grid
- 4-pt base scale: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 48`.
- Screen edge padding: **16px** (compact) or **20px** (comfortable). Pick one and stick to it across the app.
- Card padding: 16px. Section gap: 24px.

### Iconography
- **Phosphor Icons** (Regular weight) or **Lucide** — single library across the app.
- 24px default; 20px in dense rows; 32px in empty states.

### Motion
- **Durations:** 150ms (micro), 250ms (standard), 350ms (sheets).
- **Easing:** `ease-out` for enters, `ease-in` for exits.
- Skeleton shimmer on every list/detail loading state.
- Haptics: light tap on primary actions (iOS); medium on destructive confirm.

### Common Components (define once, reuse everywhere)
- **Button:** Primary / Secondary / Ghost / Destructive — 48px tall, 12px radius, full-width on forms.
- **Input:** floating label, helper/error text slot, 56px tall.
- **Card:** 12–16px radius, `bg/elevated`, soft shadow `0 1px 3px rgba(0,0,0,0.06)`.
- **Status Pill:** rounded-full, 12/16 type, soft tinted background (`bg/<status>/10%`) + saturated text.
- **List Row:** 64–72px tall, leading icon/avatar, title + subtitle, trailing amount or chevron.
- **Bottom Sheet:** snap points 50% / 90%; drag handle; rounded top 20px.
- **FAB:** 56px circle, accent color, elevated shadow, opens quick-actions sheet.
- **Empty State:** centered illustration (~160px), H3 headline, body text, 1 primary CTA.
- **Skeleton:** rounded rectangles matching real layout, 1.5s shimmer.
- **Toast:** top-anchored snackbar, auto-dismiss 3s, swipe to dismiss.
- **Segmented Control:** iOS-style; used for list scopes (e.g. "All / Unpaid / Paid").

### Layout Primitives
- **AppHeader:** large title (collapses on scroll), back button, trailing action icon(s).
- **TabBar (bottom):** 5 tabs, icon + label, active accent + tab indicator dot.
- **SectionHeader:** small uppercase label `text/secondary`, 12px letter-spacing 0.5.

### Status → Color Map (consistent everywhere)
- Draft → `info`
- Sent / Submitted → `info`
- Pending / Awaiting Approval → `warning`
- Paid / Approved / Active / Confirmed → `success`
- Partial → `warning`
- Overdue / Past Due → `danger`
- Void / Rejected / Cancelled → `text/secondary` (muted, strikethrough optional)

---

## 1. Auth & Onboarding

### Screen 1 — Splash
- **Layout:** centered logo (96px), tagline below in `text/secondary`, subtle gradient background.
- **Behavior:** 800ms minimum, then fade to next screen.
- **Components:** Logo, tagline text, optional indeterminate progress bar at bottom.
- **Modern touches:** animated logo entrance (scale 0.9 → 1, fade-in).

### Screen 2 — Login
- **Layout:**
  - Top 30%: Logo + welcome H1 ("Welcome back") + subtitle.
  - Middle: Email input → Password input (with show/hide eye).
  - Below inputs: "Forgot password?" right-aligned link.
  - Bottom: full-width Primary Button "Sign In", then secondary text "New here? Contact admin".
- **Components:** TextInput (email, password), Button, TextLink, optional BiometricToggle ("Use Face ID next time").
- **States:** idle, loading (button spinner), error (inline red text under field, shake animation on submit).
- **Modern touches:** floating-label inputs, biometric prompt on second visit, keyboard avoidance with smooth scroll.

### Screen 3 — Forgot Password
- **Layout:** Back arrow, H1 "Reset password", subtitle "Enter your email and we'll send a reset link", email input, full-width Primary "Send Reset Link".
- **Success state:** swap to a centered checkmark illustration + "Check your email" + secondary "Open Mail App" button.

### Screen 4 — Reset Password
- **Layout:** H1 "Create new password", two password inputs (new, confirm), live strength meter + rules checklist (8+ chars, 1 number, 1 symbol — checkmarks turn green as satisfied), full-width Primary "Update Password".
- **Modern touches:** real-time validation, success → 2s confirmation screen → route to Login.

### Screen 5 — MFA Challenge
- **Layout:** H1 "Verify it's you", subtitle "Enter the 6-digit code from your authenticator", 6 single-digit OTP cells (auto-advance), "Resend code" link, primary "Verify".
- **Components:** OTPInput (6 cells), CountdownTimer for resend.
- **Modern touches:** auto-paste from clipboard, auto-submit when all 6 filled, gentle shake on wrong code.

### Screen 6 — Company Switcher (post-login & accessible from More)
- **Layout:** H1 "Choose a company", searchable list of companies as cards. Each card: company logo/initial avatar, name, role badge ("Admin"/"Standard"), checkmark if active.
- **Components:** SearchBar, CompanyCard list, optional "+ Create Company" footer button (admin only).
- **Modern touches:** hero gradient on active company card, subtle press animation.

---

## 2. Home / Dashboard

### Screen 7 — Home Dashboard ★ flagship
- **Layout (scrollable):**
  1. **Header bar:** company name + chevron (taps → switcher), notification bell with badge, profile avatar.
  2. **Greeting:** "Good morning, Abbas" + small date.
  3. **Hero KPI carousel:** horizontally swipeable cards (Cash Balance, Net Income MTD, Outstanding AR, Outstanding AP). Each card: icon, label, big number, sparkline, MoM delta pill (`+12.4% ↑` green).
  4. **Cash Flow chart:** 30-day mini line/area chart with toggle pills (7D / 30D / 90D).
  5. **Quick Actions row:** 4 icon tiles (New Invoice, Scan Receipt, New Expense, Record Payment).
  6. **AR/AP summary:** two side-by-side cards with bucket bars (Current / 1–30 / 31–60 / 90+).
  7. **Recent Activity:** vertical list of 5 entries (icon + title + time + amount); "See all" footer.
- **Components:** KPICard, Sparkline, AreaChart, QuickActionTile, AgingMiniBar, ActivityRow.
- **Modern touches:** parallax header that shrinks on scroll, animated count-up on KPI numbers, blurred frosted bell-icon area, dark mode swaps line chart fills to glow gradients.
- **Empty state:** if no data — friendly illustration + "Let's create your first invoice" primary CTA.

### Screen 8 — Quick Stats Detail
- **Layout:** Pulled from Home tile tap. Big focused chart on top (line/bar), filter chips (period), sortable list of contributing items below.
- **Components:** ChartHero, FilterChips, RankedList.

### Screen 9 — Recent Activity Feed
- **Layout:** Full-screen vertical list grouped by day ("Today", "Yesterday", "Apr 15"). Each row: entity icon, title, who did it, relative time, amount/status pill.
- **Components:** GroupedList, ActivityRow.
- **Modern touches:** infinite scroll with skeleton, sticky day headers, swipe row → quick view.

---

## 3. Sales — Invoices

### Screen 10 — Invoice List
- **Layout:**
  1. Large title "Invoices" + count subtitle.
  2. Search bar + filter icon (badge if filters applied).
  3. Segmented control: All / Unpaid / Overdue / Paid / Draft.
  4. **List rows:** Customer avatar/initial → invoice # + customer name + due date → amount stacked over status pill.
  5. **FAB:** "+" → opens quick-create.
- **Components:** SearchBar, SegmentedControl, InvoiceRow, StatusPill, FAB.
- **Empty state:** "No invoices yet" + create CTA.
- **Modern touches:** swipe row right → "Mark sent / Record payment"; swipe left → "Void" (with confirm).

### Screen 11 — Invoice Filter Sheet
- **Layout (bottom sheet 90% snap):**
  - Drag handle, "Filters" title, "Reset" link top right.
  - Sections: Status (multi-select chips), Date Range (preset chips + custom range picker), Customer (search-pick), Amount range (dual slider).
  - Bottom: "Apply Filters" full-width primary, sticky.
- **Components:** ChipMultiSelect, DateRangePicker, AmountSlider.

### Screen 12 — Invoice Detail
- **Layout:**
  1. **Hero header:** Status pill, big amount, due date, customer name + avatar.
  2. **Action row (icon buttons):** Send, Share PDF, Record Payment, More menu (Edit, Duplicate, Void, Delete).
  3. **Line items card:** product/service list with qty × rate = amount.
  4. **Totals card:** subtotal, discount, tax, total, **Amount Due (highlighted)**.
  5. **Payment history card:** each payment row with date, method, amount.
  6. **Notes / Terms** (collapsible).
  7. **Audit / Activity** (collapsible at bottom).
- **Components:** InvoiceHeroHeader, ActionIconRow, LineItemsCard, TotalsCard, PaymentHistoryRow, CollapsibleSection.
- **Modern touches:** swipe down to dismiss; top hero parallax; print-style receipt aesthetic for the totals.

### Screen 13 — Invoice Create / Edit
- **Layout (multi-section form):**
  1. Customer picker (large tap target, opens search modal).
  2. Invoice # (auto-filled, editable), Issue Date, Due Date pickers.
  3. **Line Items section:** add-row affordance prominent; each line is a card with product picker, qty, rate, tax, subtotal.
  4. **Totals card** (read-only, live-updating).
  5. Discount, Tax-overall, Notes, Terms (collapsible advanced).
  6. **Sticky footer bar:** big total + "Save Draft" + "Save & Send" primary.
- **Components:** CustomerPickerInline, DateField, LineItemCard (with delete swipe), AddLineButton, TotalsCard, StickyFormFooter.
- **Modern touches:** drag-to-reorder line items, inline product autocomplete, tax field shows live calculation.

### Screen 14 — Send Invoice Sheet
- **Layout (bottom sheet):** "Send invoice" title, recipient email chip input (multi), CC/BCC (collapsible), subject input, message text area with template variable hints, "Attach PDF" toggle, primary "Send Now".
- **Components:** EmailChipInput, ExpandableSection, Toggle.

### Screen 15 — Record Payment
- **Layout:** invoice summary card (read-only) → payment method picker (Cash / Check / Bank Transfer / Card) with icons → amount input (defaults to amount due, allow partial) → date picker → reference field → notes → primary "Record Payment".
- **Components:** SegmentedIconPicker, AmountInput (currency-formatted), DateField.
- **Modern touches:** big numeric keypad style amount input, success state with confetti micro-animation + auto-dismiss.

---

## 4. Sales — Estimates

### Screen 16 — Estimate List
- Same pattern as Invoice List. Segmented: All / Sent / Accepted / Expired / Draft.

### Screen 17 — Estimate Detail
- Same pattern as Invoice Detail, but action row is: Send, Share PDF, **Convert to Invoice (highlighted primary)**, Mark Accepted, More.
- Show expiration countdown chip on hero ("Expires in 4 days").

### Screen 18 — Estimate Form
- Same as Invoice Form. Footer actions: "Save Draft" + "Save & Send".

### Screen 19 — Convert to Invoice
- Confirmation sheet: estimate summary card → "This will create a new invoice" copy → optional fields (due date override) → primary "Create Invoice". Success → routes to new invoice detail.

---

## 5. Sales — Customers

### Screen 20 — Customer List
- **Layout:** Search bar + "+" trailing in header. Sectioned alphabetic list. Row: avatar (initial in tinted circle), name, email/phone subtitle, AR balance trailing (red if outstanding).
- **Modern touches:** A–Z scrollbar on right edge, sticky letter headers.

### Screen 21 — Customer Detail
- **Layout:**
  1. **Profile hero:** large avatar, name, status pill, contact icons row (call, email, map).
  2. **AR summary card:** outstanding balance + aging mini-bar.
  3. **Tabs:** Overview / Invoices / Estimates / Activity.
  4. Overview: contact info, billing/shipping addresses, default terms, currency, notes.
- **Components:** ProfileHero, ContactIconRow, ARSummaryCard, TopTabs.
- **Modern touches:** tap call/email opens native intents; map icon launches Apple/Google Maps with billing address.

### Screen 22 — Customer Quick-Add
- **Layout (bottom sheet):** display name, email, phone, optional currency, primary "Add". Compact — no advanced fields here (those are on web).

---

## 6. Expenses — Expenses & Receipt Scan ★ flagship

### Screen 23 — Expense List
- **Layout:**
  1. Title + total spend MTD subtitle ("$4,210 this month").
  2. Search + filter.
  3. **Category breakdown chip strip:** horizontally scrollable spend-by-category chips with mini % bars.
  4. Segmented: All / Pending / Approved / Reimbursable.
  5. Rows: vendor logo/initial, category, date subtitle, amount + status pill.
  6. **FAB → Quick action sheet** with: Scan Receipt (camera icon, prominent), Manual Expense, Mileage.
- **Modern touches:** swipe row → quick categorize.

### Screen 24 — Expense Detail
- **Layout:**
  1. Hero: amount, vendor, date, status pill, category chip.
  2. **Receipt image card:** large, tap to fullscreen lightbox.
  3. Details: account, project (link), tax, payment method, reimbursable toggle, notes.
  4. Action row: Edit, Delete, Re-scan (re-OCR).
- **Modern touches:** pinch-zoom lightbox; "before/after" if user re-scanned.

### Screen 25 — Expense Form (manual)
- **Layout:** vendor picker → amount (large) → date → category picker (icon grid) → account → project (optional) → tax → notes → "Attach Receipt" optional → primary "Save".
- **Modern touches:** spend-amount has a big numeric input; category picker uses colorful icon tiles.

### Screen 26 — ★ Receipt Scan Camera
- **Layout (full-screen):**
  1. **Live camera viewfinder** with overlay rectangle guide ("Align receipt within frame").
  2. Top bar: close X, flash toggle, gallery picker (last photo thumbnail).
  3. Bottom: large shutter button (78px), "Multi-page" toggle to chain multiple snaps.
  4. Subtle edge-detection overlay when receipt is detected (corners highlight green).
- **Components:** CameraView, EdgeDetectionOverlay, ShutterButton, FlashToggle, MultiPageBadge.
- **Modern touches:** automatic perspective correction preview after snap; haptic on capture; swap to "Processing…" overlay with skeleton OCR.

### Screen 27 — ★ Receipt OCR Confirm
- **Layout (split view):**
  1. **Top half:** receipt image (cropped + corrected), tap to retake.
  2. **Bottom half (scrollable form):** auto-filled fields highlighted with subtle accent border:
     - Vendor (with autocomplete; show match confidence dot if low)
     - Date
     - Total amount
     - Tax amount
     - Suggested category (with "Change" link)
     - Account
     - Project (optional)
     - Notes
  3. **Sticky footer:** "Discard" + primary "Save Expense".
- **Modern touches:**
  - Each OCR-detected field shows a tiny ✨ icon — taps reveal "Detected from receipt" tooltip.
  - Low-confidence fields pulse softly to draw attention.
  - Success state with checkmark + slide-down toast "Expense saved", then route to detail.

### Screen 28 — Category Picker Modal
- **Layout (bottom sheet):** search bar at top; grid of category icons (4 columns) with label below each; "Recently used" section first; full list grouped by parent category.
- **Modern touches:** colored icon backgrounds matching category type, subtle bounce on select.

---

## 7. Expenses — Bills

### Screen 29 — Bill List
- Mirror Invoice List style. Segmented: All / Unpaid / Overdue / Paid / Draft.
- Trailing amount in row uses `danger` color if overdue.

### Screen 30 — Bill Detail
- Mirror Invoice Detail. Action row: Mark Paid (primary), Edit, Duplicate, Void.
- Show vendor instead of customer in hero.

### Screen 31 — Bill Form
- Mirror Invoice Form, but vendor picker + expense account per line item.

### Screen 32 — Pay Bill
- Mirror Record Payment. Adds "Pay from account" picker (which bank account).

### Screen 33 — Vendor Picker Modal
- Same pattern as Customer picker — search + alphabetic list + "+ New vendor" footer.

---

## 8. Expenses — Vendors

### Screens 34–36 — Vendor List / Detail / Quick-Add
- Mirror Customer screens 20–22. AR balance becomes AP balance (color stays the same — outstanding is informational, not bad).

---

## 9. Approvals

### Screen 37 — Approvals Queue
- **Layout:**
  1. Header with badge count ("3 pending").
  2. Segmented: My Pending / My Submissions / Team.
  3. **Cards (not rows)** to convey importance: each card has document type icon, requester avatar, amount, document title, "Submitted 2h ago", primary action buttons inline (Approve ✓ / Reject ✗) + "Review" tertiary.
- **Modern touches:** swipe right on card = approve (with green confirmation overlay); swipe left = reject (opens reject sheet).

### Screen 38 — Approval Detail
- **Layout:** full document preview (invoice/bill/expense rendered like its own detail screen, read-only) + **collapsible "Approval History" timeline** at bottom showing each step with avatar, action, timestamp, comment.
- **Sticky footer:** Reject (ghost danger) + Approve (primary).

### Screen 39 — Approve / Reject Sheet
- **Layout (bottom sheet):**
  - Approve: optional comment, primary "Approve". Success state → confetti + auto-pop back.
  - Reject: **required** reason text area + primary destructive "Reject".
- **Modern touches:** word-count helper, "Reason templates" chip suggestions ("Missing receipt", "Wrong amount", "Duplicate").

---

## 10. Time Tracking

### Screen 40 — Timer ★ flagship
- **Layout:**
  1. **Project + task pickers** at top (collapsed when timer running).
  2. **Hero timer:** giant circular ring showing seconds; center shows `00:00:00` in tabular numerals.
  3. Below ring: pulsing dot + "Recording" status when active.
  4. **Big circular Start button** (accent) → swaps to **Pause + Stop** twin buttons.
  5. Description input below (visible when paused/stopped).
  6. Summary tag chips (billable toggle, project name, hourly rate from project).
- **Modern touches:** breathing animation on the ring while running; Live Activity / Dynamic Island support on iOS; persistent notification with Stop on Android; haptic on start/stop.

### Screen 41 — Time Entry List
- **Layout:** sectioned by day with day total in section header; each row: project color dot + task title, project name subtitle, time duration trailing + status pill.
- **Modern touches:** week scrubber at top (7 day pills with totals); tap day → filter list.

### Screen 42 — Time Entry Form (manual)
- **Layout:** project picker → task input → date → start/end pickers (or duration input toggle) → billable toggle → hourly rate (override) → notes → primary "Save".

### Screen 43 — Submit for Approval
- **Layout:** week view with checkboxes per entry, header summary card (total hours, billable, est. revenue), sticky bottom "Submit X entries" primary.
- **Modern touches:** "Select all approved-ready" smart button; per-day expand/collapse.

---

## 11. Projects

### Screen 44 — Project List
- **Layout:** Card grid (1 column on phone). Each card: color stripe top, project name, customer subtitle, status pill, progress bar (if budget), key stats row (hours / spent / billed).
- **Modern touches:** pinch list ↔ grid toggle; status filter chips.

### Screen 45 — Project Detail
- **Layout:**
  1. Hero header with color, name, customer, status pill, edit icon.
  2. **KPI strip:** Budget vs Spent, Hours Logged, Margin %.
  3. **Tabs:** Overview / Time / Expenses / Invoices / Team.
- **Modern touches:** progress ring for budget consumption.

### Screen 46 — Project Profitability
- **Layout:** big P&L summary card (Revenue, Cost, **Profit**, **Margin %**), then breakdown sections: Revenue by invoice, Cost by time entry, Cost by expense.
- **Modern touches:** waterfall chart from revenue → costs → profit.

---

## 12. Banking

### Screen 47 — Bank Account List
- **Layout:** card per account: bank logo (or initial), account name, masked account number, **big balance**, last sync time, trend mini-sparkline.
- **Modern touches:** card carousel feel; pull to refresh syncs.

### Screen 48 — Transactions Feed
- **Layout:** account header card → searchable list grouped by date. Row: merchant/description, category chip, amount (debits red, credits green), match status icon (✓ matched, ⚠️ unmatched).

### Screen 49 — Transaction Detail
- **Layout:** big amount hero, merchant + date subtitle, match status banner ("Matched to Invoice #INV-0042" with link), categorize CTA, notes, attachments (receipt link).

### Screen 50 — Reconciliation View (read-only)
- **Layout:** session summary card (statement balance, cleared, difference, status), progress ring; list of cleared/uncleared transactions with checkmarks; banner "Finish reconciliation on web" with web-app link.

---

## 13. Reports (read-only)

> All 6 reports share a common structure — design as **one template**, vary the body.

### Common Report Template (Screens 51–56)
- **Header:** report title, date range pill (tap → DateRangePicker sheet), share icon (export PDF/CSV).
- **KPI strip:** 2–3 hero numbers for the report.
- **Body chart:** appropriate chart type per report (see below).
- **Body table/list:** indented rows with totals; collapsible groups.
- **Footer:** "Export" full-width secondary.

### Per-report charts:
- **51 P&L:** stacked bar of Income vs Expenses by month + Net Income line overlay.
- **52 Balance Sheet:** donut for Assets / Liabilities / Equity composition.
- **53 Cash Flow:** waterfall: Operating + Investing + Financing → Net Change.
- **54 AR Aging:** stacked horizontal bars per customer (Current / 1–30 / 31–60 / 61–90 / 90+).
- **55 AP Aging:** same as AR Aging.
- **56 Sales by Customer:** ranked horizontal bar chart (top 10) + scrollable list below.

**Modern touches:** all charts respect dark mode with glow gradients; pinch to zoom on chart; tap a slice/bar → drills to filtered list.

---

## 14. Products

### Screen 57 — Product List
- Searchable list. Row: product image (or icon), name, SKU subtitle, price trailing, qty-on-hand badge (red if low stock).

### Screen 58 — Product Detail
- Hero image, name, SKU, type chip (Inventory / Service / Non-inventory), big price, tabs: Overview / Stock / Pricing.

### Screen 59 — Stock Card
- Hero: current qty + avg cost. Below: list of inventory transactions (in/out) with running balance trailing, color-coded arrows (in green ↓, out red ↑).

---

## 15. Notifications

### Screen 60 — Notifications Inbox
- **Layout:** grouped by Today / Earlier this week / Older. Row: type icon, title, body 1-line, time, read/unread dot.
- **Modern touches:** swipe to mark read / delete; "Mark all read" header action; empty state has bell-with-Z illustration.

### Screen 61 — Notification Settings
- **Layout:** sectioned toggles: Push / Email per event type (Approval requested, Invoice paid, Bill overdue, Mention, Payment received, Time entry approved). Each row: icon, title, channel toggles inline.
- **Modern touches:** master "Pause notifications" toggle at top with snooze options (1h / today / custom).

---

## 16. Profile / Settings / More

### Screen 62 — Profile
- **Layout:** large avatar (tap to change), name, email, role pill, sectioned info: Personal Info, Security (2FA, Change Password), Sessions (active devices), Sign Out (destructive at bottom).

### Screen 63 — Change Password
- Three inputs (current, new, confirm) with same strength meter as Reset Password.

### Screen 64 — Currency Preference
- Searchable list of currencies; current selection has checkmark; "Base currency" pinned at top with lock icon (read-only — set by company admin).

### Screen 65 — About
- Static-ish: app icon, version, build number, links (Help, Privacy, Terms, Open Source Licenses, Contact Support).

### Screen 66 — More Menu
- **Layout:** sectioned list serving as the hub for non-tabbed screens.
  - **Workspace:** Company Switcher, Currency, Settings.
  - **Tools:** Time Tracking, Projects, Banking, Reports, Products.
  - **Account:** Profile, Notifications, Help, Sign Out.
- **Modern touches:** subtle section headers, premium feel; user card at top showing avatar + name + active company.

---

## 17. Cross-screen Patterns to Get Right

These appear repeatedly — design them once and reuse:

1. **Big-amount hero** (used on Invoice/Bill/Expense detail, Payment, Pay Bill) — large tabular figure, currency code muted next to it, status pill below.
2. **Picker sheets** (customer, vendor, product, category, project) — always bottom sheet 90% snap, search at top, "+ New" footer for inline create.
3. **Status pills** — single component, palette per status (see §0 status map).
4. **Action icon row** (Detail screens) — 4–5 round icon buttons with labels below, evenly spaced; "More" overflow on the right.
5. **Sticky form footer** — primary CTA always reachable; show running total when relevant.
6. **Empty states** — every list and tab needs a designed empty state, not a blank screen.
7. **Skeleton loaders** — first paint of any list/detail is skeleton, not spinner.
8. **Swipe actions** — leading swipe = positive (mark paid, approve); trailing swipe = destructive (void, delete) with confirm.
9. **Confirmations** — destructive actions use bottom sheet confirm with action button colored danger.
10. **Toasts** — top-anchored, auto-dismiss, with an optional "Undo" button on reversible actions.

---

## 18. Accessibility (non-negotiable)

- **Tap targets:** ≥44×44pt iOS / 48×48dp Android.
- **Contrast:** body text ≥ 4.5:1; large text ≥ 3:1.
- **Dynamic type:** respect OS font scale up to XXL.
- **Voice over labels:** every interactive element labeled.
- **Color is never the only signal** — pair with icon or text (e.g. status uses pill text + color).
- **Reduced motion:** disable parallax + decorative animations when user has it enabled.

---

## 19. Deliverables Expected from Design

For each of the 66 screens:

1. **High-fidelity mockup** in light mode.
2. **High-fidelity mockup** in dark mode.
3. **Interaction states:** default, loading (skeleton), empty, error, success, permission-denied (where applicable).
4. **Responsive variants:** small phone (iPhone SE / 360dp Android) and large phone (Pro Max / 412dp Android).
5. **Component specs** added to a shared design system file (Figma library) covering the items in §0.
6. **Prototype links** for the three flagship flows: **Receipt Scan**, **Invoice Create → Send → Payment**, **Approval Decide**.
7. **Iconography + illustration set** for empty states (one per major area).

---

## 20. Out-of-scope Reminder

Designer should **not** design these — they are web-only:
- Chart of Accounts editor
- Journal Entry compose
- Custom Report Builder
- Payroll runs, Tax registers, E-invoicing config
- Bulk import, Data I/O, Webhook config
- RBAC editor, OAuth/API key management
- Recurring transaction template editing
- Reconciliation editing (mobile is read-only view)
- Product create/edit (mobile is read-only)

If a user lands somewhere these belong, design a single shared **"Open on web" empty card** with a deep link button.

---

*Design Brief v1.0 · 2026-04-29 · FinanX Mobile · 66 screens · iOS + Android · Light + Dark*
