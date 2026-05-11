# MOBILE_AUTH_SPLASH

**Screen #:** 1 · **Area:** Auth & Onboarding · **Route key:** `Splash`
**Design ref:** [Design Brief §1 — Screen 1](../MOBILE_APP_DESIGN_BRIEF.md#screen-1--splash)
**Index ref:** [Master Index §4.1](../MOBILE_APP_SCREENS_INDEX.md#41-auth--onboarding-6-screens)

---

## 1. Screen Purpose

First screen on app launch. Hydrates auth state (read JWT from secure storage, validate, fetch current user + permissions), then routes to either `Login` (no/invalid token) or the authenticated app shell.

## 2. Wireframe Description

Centered logo, tagline below in muted text. Subtle gradient background. Optional indeterminate progress bar at the bottom edge. No interactive elements. Animated logo entry (scale 0.9 → 1, fade-in over 400ms). Minimum 800ms display time so the animation reads as intentional rather than a flash.

## 3. Component Breakdown

| Component | State / Props |
|-----------|---------------|
| `AppLogo` | size=96 |
| `Text` (tagline) | color=`text/secondary` |
| `IndeterminateBar` | visible while bootstrapping |

State owned: `bootstrapStatus: 'loading' | 'ready' | 'error'`.

## 4. Navigation

- **Entry:** app cold start (root route).
- **Exit:**
  - No token in keychain → `AuthStack/Login`
  - Token valid + single company → `AppTabs/Home`
  - Token valid + multiple companies and no active company persisted → `CompanySelect`
  - Token expired → attempt `POST /auth/refresh` once → on success route as above; on failure → `AuthStack/Login`
- **Params:** none.
- **Deep link handoff:** if app was opened via deep link (e.g. `finanx://invoice/123`), preserve the intent and route to it after auth bootstrap.

## 5. Backend Integration

### 5.1 Read token (no API call)
Read `accessToken` + `refreshToken` from secure storage via `react-native-keychain`. Store in memory on the API client.

### 5.2 Validate token / load user
**Endpoint:** `GET /api/v1/auth/me`
**Headers:** `Authorization: Bearer <accessToken>`
**Response 200:**
```ts
{
  status: 'success',
  message: 'User retrieved successfully',
  data: {
    id: string,
    email: string,
    firstName: string | null,
    lastName: string | null,
    isPrimaryAdmin: boolean,
    role: { code: string, name: string } | null,
    company: { id: string, name: string },
    permissions: string[]
  }
}
```
> **Note:** `/auth/me` does NOT return `companyId`, `roleId`, or `twoFactorEnabled` as direct fields. Use `company.id` for company ID. For full profile data (phone, avatarUrl, preferences) use `GET /users/me` — that is a separate endpoint.

**Errors:** `401` → token invalid/expired → attempt refresh (§5.3).

### 5.3 Refresh on 401
**Endpoint:** `POST /api/v1/auth/refresh`
**Body:** `{ refreshToken: string }`
**Response 200:**
```ts
{
  status: 'success',
  message: 'Tokens refreshed successfully',
  data: {
    accessToken: string,
    refreshToken: string
    // Note: no expiresIn field returned
  }
}
```
- On success: persist new tokens to keychain, update API client header, retry `GET /auth/me`.
- On failure (`401`): clear keychain, route to Login.
- Refresh tokens expire after **7 days**.

### 5.4 Load permissions (parallel with /me)
**Endpoint:** `GET /api/v1/auth/my-permissions`
**Response 200:**
```ts
{
  status: 'success',
  message: 'Permissions retrieved successfully',
  data: {
    permissions: string[],      // all permission codes for the user
    isPrimaryAdmin: boolean,
    role: { id: string, code: string, name: string } | null
  }
}
```
Persist `permissions` array in Zustand (`useSession`) for permission gating across the app.

> **Optimization:** `/auth/me` already returns `permissions` in its response. Run `/auth/me` and `/auth/my-permissions` in parallel — use whichever resolves first to hydrate permissions, then confirm with the other.

### 5.5 Load companies (only if no active company persisted)
**Endpoint:** `GET /api/v1/auth/my-companies`
**Response 200:**
```ts
{
  status: 'success',
  message: 'Companies retrieved successfully',
  data: Array<{
    companyId: string,
    companyName: string,
    userId: string,
    role: { code: string, name: string } | null,
    isPrimaryAdmin: boolean,
    lastLoginAt: string | null,
    isCurrentCompany: boolean,
    isActive: boolean
  }>
}
```
> Field names are `companyId` / `companyName` (not `id` / `name`) in this response. Map accordingly when passing to `CompanySelect`.

## 6. State & Data Flow

- **Cache keys:** `['auth','me']`, `['auth','permissions']`, `['auth','myCompanies']`.
- React Query `staleTime: Infinity` for `me` + `permissions` (refresh on explicit re-login or company switch).
- Splash kicks the queries imperatively (await) before navigating away.

## 7. Offline Behavior

- If offline AND a cached `me` payload exists in MMKV → optimistically route into the app and let screens fall back to cached reads.
- If offline AND no cached `me` → show inline error: "You're offline. Connect to sign in." with a Retry button.

## 8. Push Triggers

None target this screen directly. If the app was killed and reopened via push, the deep link is queued and applied after Splash resolves auth.

## 9. Edge Cases & Validation

- Token present but `company` missing on `/auth/me` response → route to `CompanySelect`.
- Refresh succeeds but `me` still 401 → clear all auth state, route to Login.
- Permissions fetch fails but `me` succeeds → continue with the `permissions` array from `/auth/me` response as fallback.
- Animation must respect `prefers-reduced-motion` — hold static logo without parallax.
- Refresh token expiry is 7 days — if expired, user must log in again.

## 10. Acceptance Criteria

- [ ] Cold start with no token routes to Login within ≤1.2s.
- [ ] Cold start with valid token routes to Home and KPI cards render without a flash of empty state.
- [ ] Cold start with expired token successfully silently refreshes and proceeds.
- [ ] Cold start while offline with cached user → enters app; without cache → shows offline error.
- [ ] Deep link captured pre-auth is honored post-auth.
- [ ] Light + dark mockups implemented and pixel-matched to design.
