# MOBILE_AUTH_COMPANY_SWITCHER

**Screen #:** 6 · **Area:** Auth & Onboarding · **Route key:** `CompanySelect`
**Design ref:** [Design Brief §1 — Screen 6](../MOBILE_APP_DESIGN_BRIEF.md#screen-6--company-switcher-post-login--accessible-from-more)
**Index ref:** [Master Index §4.1](../MOBILE_APP_SCREENS_INDEX.md#41-auth--onboarding-6-screens)

---

## 1. Screen Purpose

Choose the active company. Used in two contexts:
1. **Post-login** — when login response indicates `requiresCompanySelection: true`, or after 2FA verification for multi-company users.
2. **In-app switcher** — opened from More tab / header company chip; rotates the JWT to the chosen company without re-entering password.

## 2. Wireframe Description

H1 "Choose a company". Search bar (hidden if ≤ 5 companies). Vertical list of company cards. Each card: large avatar (logo if available, else colored initial from `companyName`), company name, role badge (`role.name` — e.g. "Admin"), subtle subtitle (e.g. base currency if available). The currently active company has a hero gradient background and a checkmark on the right. Tap a non-active card → selection animation (gentle scale + checkmark slide-in) → API call → route to Home.

Footer: "+ Create Company" button (visible only if user has `company:create` permission — check from Zustand permissions store).

## 3. Component Breakdown

| Component | Props / State |
|-----------|---------------|
| `SearchBar` | debounced 300ms, hidden if ≤5 companies |
| `CompanyCard` | `{ companyId, companyName, role, isCurrentCompany, isActive }`, onPress |
| `Button` ("+ Create Company") | gated by `company:create` permission |
| `LoadingSkeleton` | initial fetch state (in-app mode) |
| `EmptyState` | "No companies found" |

State owned: `searchQuery`, `selectingId` (during API transition).

## 4. Navigation

- **Entry contexts:**
  - **Post-login:** from `Login` or `MFAChallenge` with `{ mode: 'post-login', tempToken, companies }`.
  - **In-app:** from `MoreMenu` or header company chip with `{ mode: 'in-app' }` — no tempToken; uses current JWT.
- **Exit:**
  - Selection success → `AppTabs/Home` with all caches invalidated.
  - "+ Create Company" → `CreateCompanyForm` (out of Phase A scope).
  - Back (in-app context only) → previous screen. No back in post-login mode.
- **Params:** `{ mode: 'post-login' | 'in-app', tempToken?: string, companies?: Array<CompanyItem> }`.

## 5. Backend Integration

### 5.1 List companies (in-app mode only)
**Endpoint:** `GET /api/v1/auth/my-companies`
**Headers:** `Authorization: Bearer <accessToken>`
**Response 200:**
```ts
{
  status: 'success',
  message: 'Companies retrieved successfully',
  data: Array<{
    companyId: string,       // NOT 'id'
    companyName: string,     // NOT 'name'
    userId: string,
    role: { code: string, name: string } | null,
    isPrimaryAdmin: boolean,
    lastLoginAt: string | null,
    isCurrentCompany: boolean,   // true if this is the active company in current JWT
    isActive: boolean
  }>
}
```
> **Post-login mode does NOT call this** — the companies list is already in the navigation params from the login/2FA response. Use `isCurrentCompany` (not `isActive`) to determine which company to highlight with the hero gradient.

### 5.2 Select company (post-login mode)
**Endpoint:** `POST /api/v1/auth/select-company`
**Body:**
```ts
{
  tempToken: string,    // from login/MFA response params, expires in 5 minutes
  companyId: string
}
```
**Response 200:**
```ts
{
  status: 'success',
  message: 'Company selected successfully',
  data: {
    accessToken: string,
    refreshToken: string,
    user: {
      id: string,
      email: string,
      firstName: string | null,
      lastName: string | null,
      isPrimaryAdmin: boolean,
      role: { code: string, name: string } | null
    },
    company: { id: string, name: string },
    permissions: string[]
  }
}
```
**Errors:**
- `401` `{ message: 'Invalid or expired company selection token. Please login again.' }` → toast + navigate to Login (tempToken expired — 5 min window).
- `401` `{ message: 'Invalid token purpose' }` → toast + navigate to Login.
- `401` `{ message: 'Invalid company selection' }` → toast + remove card from list.

### 5.3 Switch company (in-app mode)
**Endpoint:** `POST /api/v1/auth/switch-company`
**Headers:** `Authorization: Bearer <accessToken>`
**Body:**
```ts
{ companyId: string }
```
**Response 200:**
```ts
{
  status: 'success',
  message: 'Company switched successfully',
  data: {
    accessToken: string,
    refreshToken: string,
    user: {
      id: string,
      email: string,
      firstName: string | null,
      lastName: string | null,
      isPrimaryAdmin: boolean,
      role: { code: string, name: string } | null
    },
    company: { id: string, name: string },
    permissions: string[]
  }
}
```
On success:
1. Persist new `accessToken` + `refreshToken` to keychain.
2. Update API client `Authorization` header.
3. Update Zustand `useSession` with new user, company, permissions.
4. `queryClient.clear()` — drop all per-company cached data.
5. Navigate to `AppTabs/Home`.

**Errors:**
- `404` `{ message: 'You do not have access to this company' }` → toast + remove card from list.
- `400` `{ message: 'Target company is deactivated' }` → toast + grey-out card with "Inactive" pill.
- `401` (JWT expired in-app) → trigger `POST /auth/refresh` once → retry switch; on second failure → navigate to Login.

## 6. State & Data Flow

- **Cache key (in-app):** `['auth','myCompanies']`, `staleTime: 5min`.
- After successful switch/select: `queryClient.clear()` drops all per-company data, then prefetch `['dashboard','financial-overview']` so Home renders fast.
- Active company stored in Zustand `useSession.company` and persisted in MMKV as `finanx.activeCompanyId`.
- Update Zustand `permissions` from the response immediately — no need to re-fetch `/auth/my-permissions`.

## 7. Offline Behavior

- In-app mode with cached `myCompanies` → list renders, but tapping a card while offline shows toast "You're offline. Reconnect to switch companies."
- Post-login mode requires network — show offline error if no connection.

## 8. Push Triggers

None directly. Per-company push routing is handled by the active-company filter on the notifications inbox.

## 9. Edge Cases & Validation

- **Field names:** companies from both the login response and `/auth/my-companies` use `companyId` / `companyName` — NOT `id` / `name`. Map carefully when rendering cards.
- **Active company highlight:** use `isCurrentCompany: true` (from `/auth/my-companies`) or match `companyId` against Zustand `useSession.company.id` (in post-login mode where the field isn't present).
- **Inactive companies:** `isActive: false` → render card as disabled with "Inactive" pill. Tapping shows bottom sheet "This company is paused. Contact your admin."
- **tempToken expiry (5 min):** if select-company returns 401 `Invalid or expired company selection token`, show toast "Session expired — please sign in again" and navigate to Login. User must re-authenticate.
- **During API call:** lock all cards (disable taps), show inline spinner on the selected card only.
- **After switch:** header company chip across the app must update immediately — update Zustand `useSession.company.name` synchronously before navigating.
- **Search:** filters case-insensitively on `companyName`.
- **Single company (in-app mode):** screen still works correctly; just shows one card already highlighted.

## 10. Acceptance Criteria

- [ ] Post-login multi-company → reaches CompanySelect with company list from params (no extra API call).
- [ ] Tapping a company in post-login mode → `POST /auth/select-company` with `tempToken` + `companyId` → tokens persisted → Home loads with correct company data.
- [ ] In-app switch → `POST /auth/switch-company` → JWT rotates → all caches cleared → Home re-fetches under new company.
- [ ] Active company shows hero gradient + checkmark (via `isCurrentCompany`).
- [ ] Inactive companies shown as disabled with "Inactive" pill.
- [ ] Expired tempToken → toast + navigate to Login.
- [ ] Search filters company list correctly.
- [ ] Switching while offline shows offline toast.
- [ ] Header company chip updates immediately after switch.
- [ ] Light + dark mockups implemented.
