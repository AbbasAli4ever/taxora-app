# MOBILE_AUTH_LOGIN

**Screen #:** 2 · **Area:** Auth & Onboarding · **Route key:** `Login`
**Design ref:** [Design Brief §1 — Screen 2](../MOBILE_APP_DESIGN_BRIEF.md#screen-2--login)
**Index ref:** [Master Index §4.1](../MOBILE_APP_SCREENS_INDEX.md#41-auth--onboarding-6-screens)

---

## 1. Screen Purpose

Authenticate the user with email + password. Login may produce one of three outcomes — direct success (token issued), 2FA required, or company-selection required (multi-company user) — and the screen routes accordingly.

## 2. Wireframe Description

Top 30% — logo + welcome H1 ("Welcome back") + subtitle ("Sign in to continue"). Middle — email input → password input (with show/hide eye). Below inputs: "Forgot password?" right-aligned link. Bottom — full-width Primary Button "Sign In". Below: secondary text "New here? Contact your admin".

After successful first login, on second visit show a BiometricToggle row above the password field ("Use Face ID next time").

## 3. Component Breakdown

| Component | Props / State |
|-----------|---------------|
| `AppLogo` | size=72 |
| `TextInput` (email) | autoCapitalize=none, keyboardType=email-address, autoCorrect=false |
| `TextInput` (password) | secureTextEntry, trailing eye toggle |
| `TextLink` ("Forgot password?") | onPress → `ForgotPassword` |
| `Button` (primary) | loading prop, disabled when invalid |
| `BiometricToggle` | visible only if device has cached credentials |
| `InlineError` | bound to form-level error |

State owned (RHF): `email`, `password`. Form-level: `submitting`, `serverError`.

## 4. Navigation

- **Entry:** unauthenticated root, or post-logout, or after token refresh failure.
- **Exit:**
  - Direct success → `AppTabs/Home`
  - `requires2fa: true` → `MFAChallenge` with `{ tempToken }`
  - `requiresCompanySelection: true` → `CompanySelect` with `{ mode: 'post-login', tempToken, companies }`
- **Params:** optional `{ prefilledEmail?: string, postLoginRoute?: DeepLink }`.

## 5. Backend Integration

### 5.1 Login
**Endpoint:** `POST /api/v1/auth/login`
**Rate limit:** 5 attempts per 60 seconds (throttled server-side). Account locked for **30 minutes** after 5 failed password attempts.
**Body:**
```ts
{
  email: string,
  password: string
}
```

**Response 200 — direct success (single active company):**
```ts
{
  status: 'success',
  message: 'Login successful',
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

**Response 200 — 2FA required:**
```ts
{
  status: 'success',
  message: '2FA verification required',
  data: {
    requires2fa: true,
    tempToken: string    // expires in 5 minutes
  }
}
```
> **Note:** The 2FA response does NOT include a `methods` array. The backend only supports TOTP (authenticator app) + backup codes. There is no email-OTP method. Do not show "Use email instead" option.

**Response 200 — company selection required (multi-company user):**
```ts
{
  status: 'success',
  message: 'Please select a company to continue',
  data: {
    requiresCompanySelection: true,
    tempToken: string,    // expires in 5 minutes
    companies: Array<{
      companyId: string,
      companyName: string,
      userId: string,
      role: { code: string, name: string } | null,
      isPrimaryAdmin: boolean,
      lastLoginAt: string | null,
      isActive: boolean
    }>
  }
}
```
> Field names in companies array are `companyId` / `companyName` (not `id` / `name`). Map them when passing to `CompanySelect`.

**Errors:**
- `401` `{ message: 'Invalid credentials' }` → inline form error.
- `401` `{ message: 'Account is deactivated' }` → blocking alert "Your account has been deactivated. Contact your admin."
- `401` `{ message: 'Account is temporarily locked. Please try again later.' }` → blocking alert with 30-minute lockout message (shown after 5 failed attempts).
- `429` (throttle) → toast "Too many attempts. Try again later."

### 5.2 On success — persist tokens
- Save `accessToken` + `refreshToken` to secure keychain (`react-native-keychain`).
- Hydrate API client default `Authorization: Bearer <accessToken>` header.
- Persist `permissions` array from the response into Zustand `useSession` — no separate `/auth/my-permissions` call needed after login since login already returns permissions.

## 6. State & Data Flow

- React Hook Form + Zod schema:
  ```ts
  z.object({
    email: z.string().email(),
    password: z.string().min(1, 'Required')
  })
  ```
- On submit: optimistic UI is **off** (auth must be confirmed). Show button spinner.
- On success: set `['auth','me']` and `['auth','permissions']` query cache from the login response data directly (no extra API calls needed).

## 7. Offline Behavior

- Submit blocked while `NetInfo` reports offline → toast "You're offline. Try again when connected."
- Email + password are never cached.

## 8. Push Triggers

None.

## 9. Edge Cases & Validation

- Trim whitespace from email before submit.
- Show password length-only requirement client-side; rely on server for credential validity.
- After 3 failed attempts, surface "Forgot password?" with extra visual emphasis.
- **Account lockout (30 min):** show a clear message with approximate retry time. Do not allow further submission while locked.
- **Biometric path:** if user opted in last session, on screen mount show Face ID/Touch ID prompt; on success, retrieve stored `refreshToken` from keychain, call `POST /auth/refresh` to get a new `accessToken`, skip login form entirely, proceed as normal login success.
- Keyboard avoidance: form scrolls so focused input + primary button are always visible above keyboard.
- **2FA flow:** response only has `tempToken` — no `methods` array. Navigate to `MFAChallenge` with just `{ tempToken }`. Backup codes are supported via `isBackupCode: true` flag on the verify endpoint.

## 10. Acceptance Criteria

- [ ] Valid creds → routes to Home and Home renders fresh data.
- [ ] Invalid creds → inline error, fields preserved, password masked.
- [ ] 2FA-enabled account → routes to MFAChallenge with `tempToken` only.
- [ ] Multi-company account → routes to CompanySelect with `tempToken` + `companies` (using `companyId`/`companyName` field names).
- [ ] 5 failed attempts → account locked for 30 min, clear message shown.
- [ ] 429 throttle → friendly toast shown.
- [ ] Account deactivated → blocking alert shown.
- [ ] Biometric login works on second visit if opted in.
- [ ] Light + dark mockups implemented.
- [ ] Tapping outside dismisses keyboard.
- [ ] Forgot link works.
