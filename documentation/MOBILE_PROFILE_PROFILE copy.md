# MOBILE_PROFILE_PROFILE

**Screen #:** 71 · **Area:** Profile & Settings · **Route key:** `ProfileScreen`
**Design ref:** [Design Brief §18 — Screen 71](../MOBILE_APP_DESIGN_BRIEF.md#screens-7175--profile--settings)
**Index ref:** [Master Index §4.18](../MOBILE_APP_SCREENS_INDEX.md#418-profile--settings-5-screens)

---

## 1. Screen Purpose

Personal profile hub — avatar, name, contact info, and the main settings menu. Acts as the entry point for all settings navigation from the More tab.

## 2. Wireframe Description

1. **Profile header:**
   - Large avatar (80px) — photo if `avatarUrl` exists, else colored circle with user initials. Tap → action sheet: "Choose Photo" (always), "Remove Photo" (only if `avatarUrl` is non-null).
   - Full name (H2).
   - Email (muted, read-only — no pencil icon).
   - Role badge pill — use `role.name`. No badge if `role` is null.
   - Company name chip → `CompanySettings`.
2. **Info section:**
   - First name, Last name, Phone — editable inline (pencil icon → edit mode).
   - Email row has no pencil (read-only, change-email is web-only in v1).
3. **Settings list** (grouped):
   - **Account:** Change Password → `ChangePassword`. Language & Date → `CurrencyPrefs`.
   - **Company:** Company Settings → `CompanySettings` *(hidden unless `role.name === 'Admin'` or user has `company:edit` permission)*.
   - **Notifications:** Notification Settings → `NotificationsSettings`.
   - **Session:** Switch Company → `CompanySelect` with `{ mode: 'in-app' }`.
   - **Support:** About FinanX → `AboutScreen`.
4. **Sign Out button** — destructive (red), full-width, at bottom of scroll. Separate from the list.

## 3. Component Breakdown

- `AvatarPicker` — image picker + upload (multipart). Action sheet conditionally shows "Remove Photo" only when `avatarUrl` is non-null.
- `ProfileHeader` — avatar, name, email, role badge, company chip.
- `EditableInfoRow` — label + value + pencil → inline TextInput. Email row has no pencil.
- `SettingsGroup` — section header + list rows.
- `SettingsRow` — label + chevron (+ optional badge).
- `Button` ("Sign Out", danger).

State owned: `editingField: null | 'firstName' | 'lastName' | 'phone'`, `uploading: boolean`, `saving: boolean`.

## 4. Navigation

- **Entry:** More tab → "Profile & Settings" row.
- **Exit:**
  - Company chip / Company Settings row → `CompanySettings`.
  - Change Password → `ChangePassword`.
  - Language & Date → `CurrencyPrefs`.
  - Notification Settings → `NotificationsSettings`.
  - Switch Company → `CompanySelect` with `{ mode: 'in-app' }`.
  - About → `AboutScreen`.
  - Sign Out → confirm alert → sign-out flow → stack reset to `Login`.

## 5. Backend Integration

All endpoints below are self-service — **JWT only, no permission required**.

> **Important:** Use `GET /api/v1/users/me` for profile data, NOT `GET /api/v1/auth/me`. Both endpoints exist but `/auth/me` returns a reduced response (missing `phone`, `avatarUrl`, `preferences`, `lastLoginAt`).

---

### 5.1 Load profile
**Endpoint:** `GET /api/v1/users/me`
**Headers:** `Authorization: Bearer <jwt>`
**Response 200:**
```ts
{
  success: true,
  message: string,
  data: {
    id: string,
    email: string,
    firstName: string,
    lastName: string,
    phone: string | null,
    avatarUrl: string | null,
    isPrimaryAdmin: boolean,
    isActive: boolean,
    role: { id: string, code: string, name: string } | null,   // no displayName field
    company: { id: string, name: string, logoUrl: string | null },  // no baseCurrency
    permissions: string[],
    preferences: { timezone: string | null, locale: string | null, dateFormat: string | null },
    lastLoginAt: string | null,
    emailVerifiedAt: string | null,
    createdAt: string
  }
}
```

---

### 5.2 Update profile (inline edit on blur)
**Endpoint:** `PATCH /api/v1/users/me/profile`
**Headers:** `Authorization: Bearer <jwt>`
**Body:** `{ firstName?: string, lastName?: string, phone?: string }` — only the changed field
**Response 200:**
```ts
{
  success: true,
  message: string,
  data: { id: string, firstName: string, lastName: string, phone: string }
}
```
> Response returns only `{ id, firstName, lastName, phone }` — NOT the full user object. After success, **merge** these fields into the `['users','me']` cache. Do NOT invalidate and refetch.

**On error:** revert the field to its previous value + show error toast.

---

### 5.3 Update preferences (Language & Date screen — documented here for awareness)
**Endpoint:** `PATCH /api/v1/users/me/preferences`
**Body:** `{ timezone?: string, locale?: string, dateFormat?: string }`
**Response 200:** `{ data: { timezone, locale, dateFormat } }`
> This endpoint is used by the `CurrencyPrefs` screen, not ProfileScreen directly. Documented here so the developer is aware it exists.

---

### 5.4 Upload avatar
**Endpoint:** `POST /api/v1/users/me/avatar`
**Headers:** `Authorization: Bearer <jwt>`
**Body:** `multipart/form-data`, field name **`file`**
**Accepted MIME types (server-enforced):** `image/jpeg`, `image/png`, `image/webp`
**Max size (server-enforced):** **2MB**

**Client-side steps before upload:**
1. Enforce < 2MB client-side before sending — show toast "Image must be under 2MB" if exceeded.
2. Convert HEIC → JPEG on iOS (server does not accept HEIC).
3. Resize to ≤ 2048px and JPEG quality 0.8 via `expo-image-manipulator` to stay under 2MB.
4. Show loading overlay on the avatar during upload.

**Response 200:**
```ts
{
  success: true,
  message: string,
  data: { avatarUrl: string }
}
```
On success: update `avatarUrl` in `['users','me']` cache.
> Old avatar is deleted server-side automatically when a new one is uploaded.

---

### 5.5 Remove avatar
**Endpoint:** `DELETE /api/v1/users/me/avatar`
**Headers:** `Authorization: Bearer <jwt>`
**Response 200:**
```ts
{
  success: true,
  message: 'Avatar removed successfully',
  data: { message: 'Avatar removed successfully' }
}
```

> **Important:** Backend throws an error if no avatar exists. Only show "Remove Photo" in the action sheet when `avatarUrl` is non-null.

On success: clear `avatarUrl` in `['users','me']` cache → avatar reverts to colored initials.

---

### 5.6 Sign out
**Endpoint:** `POST /api/v1/auth/logout`
**No JWT guard required** — but must pass the refresh token in the body.
**Body:**
```ts
{ refreshToken: string }   // read from keychain before calling
```
**Response 200:** `{ success: true, message: 'Logged out successfully', data: null }`

**Full sign-out sequence (exact order):**
1. If `useTimerStore.getState().isRunning === true` → show timer guard alert first ("A timer is running. Stop it before signing out?" → "Stop Timer & Sign Out" / "Cancel"). On confirm, stop timer then continue.
2. `Alert.alert('Sign Out', "You'll need to sign in again.", [Cancel, Sign Out])`
3. On confirm:
   - Read `refreshToken` from keychain: `await Keychain.getGenericPassword()`
   - `await apiClient.post('/auth/logout', { refreshToken })` — fire and forget (don't block on error)
   - `await Keychain.resetGenericPassword()`
   - `queryClient.clear()`
   - `useSession.getState().clear()`
   - `navigation.reset({ index: 0, routes: [{ name: 'Login' }] })`

## 6. State & Data Flow

**Cache key:** `['users', 'me']` — `staleTime: 300s`, refetch on screen focus.

- **Inline edit:** pencil tap → `editingField` set → TextInput renders. On blur or keyboard "Done": fire `PATCH /users/me/profile` → on success merge `{ id, firstName, lastName, phone }` into cache → clear `editingField`. On error: revert field + toast.
- **Avatar upload:** picker returns image → validate size → resize → `POST` → on success update `avatarUrl` in cache.
- **Avatar remove:** `DELETE` → on success set `avatarUrl` to null in cache.

## 7. Offline Behavior

- Cached `['users','me']` renders while offline.
- Inline edits, avatar upload, and avatar removal blocked offline — show toast "You're offline. Try again when connected."
- Sign out local steps (keychain clear, Zustand clear, navigation reset) proceed offline; the `POST /auth/logout` API call is fire-and-forget so offline failure is acceptable.

## 8. Push Triggers

None.

## 9. Edge Cases & Validation

- **Email:** read-only on mobile. No pencil icon. Change-email is web-only in v1.
- **Role null:** if `role` is null, render no badge (don't crash).
- **Role display:** use `role.name` — there is no `displayName` field on the role object.
- **Role code:** `role.code` is also available (e.g. `'ADMIN'`, `'STANDARD'`) — use for permission checks if needed.
- **Company Settings row:** hidden if `role.code !== 'ADMIN'` AND user does not have `company:edit` permission.
- **Company baseCurrency:** not returned in `/users/me`. Use `company.baseCurrency` from the `/auth/me` or `/currencies/base` endpoint if needed for display.
- **Avatar size:** enforce < 2MB client-side before upload. Server also enforces 2MB.
- **Avatar formats:** server accepts `image/jpeg`, `image/png`, `image/webp` only. Convert HEIC → JPEG on iOS before upload.
- **Remove Photo action sheet option:** only visible when `avatarUrl` is non-null.
- **Sign out while timer running:** show timer guard alert before the sign-out confirmation.
- **Logout API failure:** acceptable to ignore — local state is cleared regardless.

## 10. Acceptance Criteria

- [ ] Profile loads from `GET /users/me` (NOT `/auth/me`) with avatar/initials, name, email, role badge (`role.name`), company chip.
- [ ] Pencil tap → inline TextInput → blur → `PATCH /users/me/profile` fires → field updates from merged cache.
- [ ] Edit error → field reverts to old value + error toast shown.
- [ ] "Remove Photo" only appears in action sheet when `avatarUrl` is non-null.
- [ ] Avatar picker → HEIC conversion if needed → resize → 2MB check → upload → new avatar shown.
- [ ] Avatar removal → `DELETE` → initials avatar shown.
- [ ] Company Settings row hidden for non-admin users.
- [ ] Sign out with timer running → timer guard alert → stop timer → sign-out confirmation → logout.
- [ ] Sign out clears keychain, Zustand, queryClient, resets stack to Login.
- [ ] All settings rows navigate to correct screens.
- [ ] Light + dark mode implemented.
