# MOBILE_AUTH_COMPANY_SWITCHER

**Screen #:** 6 · **Area:** Auth & Onboarding · **Route key:** `CompanySelect`
**Design ref:** [Design Brief §1 — Screen 6](../MOBILE_APP_DESIGN_BRIEF.md#screen-6--company-switcher-post-login--accessible-from-more)
**Index ref:** [Master Index §4.1](../MOBILE_APP_SCREENS_INDEX.md#41-auth--onboarding-6-screens)

---

## 1. Screen Purpose

Choose the active company. Used in two contexts:
1. **Post-login** — when login response indicates `requiresCompanySelection` (no active company persisted) or as a one-time selection step for multi-company accounts.
2. **In-app switcher** — opened from More tab / header company chip; rotates the JWT to the chosen company without re-entering password.

## 2. Wireframe Description

H1 "Choose a company". Search bar (hidden if ≤ 5 companies). Vertical list of company cards. Each card: large avatar (logo if available, else colored initial), company name, role badge ("Admin" / "Standard" / "Limited"), subtle subtitle (e.g. base currency). The currently active company has a hero gradient background and a checkmark on the right. Tap a non-active card → selection animation (gentle scale + checkmark slide-in) → API call → route to Home.

Footer: "+ Create Company" button (visible only if user has `company:create` permission).

## 3. Component Breakdown

| Component | Props / State |
|-----------|---------------|
| `SearchBar` | debounced 300ms |
| `CompanyCard` | `{ id, name, role, isActive, logoUrl }`, onPress |
| `Button` ("+ Create Company") | gated by permission |
| `LoadingSkeleton` | initial fetch state |
| `EmptyState` | "No companies yet" (rare; only if user is mid-onboarding) |

State owned: `searchQuery`, `selectingId` (during transition).

## 4. Navigation

- **Entry contexts:**
  - **Post-login:** from `Login` or `MFAChallenge` with `{ tempToken, companies }`.
  - **In-app:** from `MoreMenu` or header company chip — no tempToken; uses current JWT.
- **Exit:**
  - Selection success → `AppTabs/Home` with caches invalidated.
  - "+ Create Company" → `CreateCompanyForm` (out of Phase A scope, deep link only).
  - Back (in-app context only) → previous screen.
- **Params:** `{ mode: 'post-login' | 'in-app', tempToken?: string, companies?: Array<{id, name, role}> }`.

## 5. Backend Integration

### 5.1 List companies (in-app mode)
**Endpoint:** `GET /api/v1/auth/my-companies`
**Headers:** `Authorization: Bearer <jwt>`
**Response 200:**
```ts
{
  data: Array<{
    id: string,
    name: string,
    role: { id: string, name: string } | null,
    isActive: boolean,        // currently active company for this session
    isPrimaryAdmin: boolean,
    baseCurrency: string,
    logoUrl?: string
  }>
}
```
> Post-login mode does NOT call this — the list is provided in the login response payload.

### 5.2 Switch company (in-app mode)
**Endpoint:** `POST /api/v1/auth/switch-company`
**Body:** `{ companyId: string }`
**Response 200:**
```ts
{
  data: {
    accessToken: string,        // new JWT with new companyId claim
    refreshToken: string,
    expiresIn: number,
    user: { ...same shape as /auth/me, scoped to chosen company },
    permissions: string[]
  }
}
```
On success: persist new tokens, replace API client header, **invalidate ALL React Query caches** (`queryClient.clear()`), then route to Home.

### 5.3 Select company (post-login mode)
**Endpoint:** `POST /api/v1/auth/select-company`
**Body:** `{ tempToken: string, companyId: string }`
**Response 200:** same shape as switch (issues full session tokens).

### 5.4 Errors
- `403` `{ message: 'Company is inactive' }` → toast + grey-out card.
- `404` `{ message: 'Company not found' }` → toast + remove from list.
- `401` (in-app, JWT expired) → trigger refresh + retry once; on second failure, route to Login.

## 6. State & Data Flow

- **Cache key (in-app):** `['auth','myCompanies']`, `staleTime: 5min`.
- After successful switch: `queryClient.clear()` to drop all per-company data, then prefetch `['dashboard','overview']` so Home renders fast.
- Active company id stored in Zustand store (`useSession.companyId`) and persisted in MMKV (`finanx.activeCompanyId`).

## 7. Offline Behavior

- In-app mode with cached `myCompanies` → list is rendered, but selecting a card while offline shows toast "You're offline. Reconnect to switch companies."
- Post-login mode requires network; show offline error.

## 8. Push Triggers

None directly. (Per-company push routing is handled by the active-company filter on the inbox.)

## 9. Edge Cases & Validation

- If a single company exists and mode is in-app, screen still works but is rarely reached.
- During `switchCompany` API call, lock the UI (disable other cards) and show inline spinner on the selected card.
- After successful switch, the header company chip across the app must reflect the new name immediately (subscribe to Zustand).
- Search filters case-insensitively on company name.
- Inactive companies (`isActive: false` returned by backend) are shown disabled with "Inactive" pill — selecting shows a sheet "This company is paused. Contact admin."

## 10. Acceptance Criteria

- [ ] Post-login multi-company → reaches CompanySelect, selecting a company lands on Home with company-correct data.
- [ ] In-app switch → JWT rotates, all caches cleared, Home re-fetches under new company.
- [ ] Active company shows hero gradient + checkmark.
- [ ] Search filters list correctly.
- [ ] Switching while offline shows offline toast.
- [ ] Light + dark mockups implemented.
