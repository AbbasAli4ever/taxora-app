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
  - 200 success with token → `AppTabs/Home`
  - 200 with `requires2fa: true` → `MFAChallenge` with `tempToken`
  - 200 with `requiresCompanySelection: true` → `CompanySelect` with `tempToken`
- **Params:** optional `{ prefilledEmail?: string, postLoginRoute?: DeepLink }`.

## 5. Backend Integration

### 5.1 Login
**Endpoint:** `POST /api/v1/auth/login`
**Rate limit:** 5 / minute (server-side throttle).
**Body:**
```ts
{
  email: string,
  password: string
}
```
**Response 200 — direct success:**
```ts
{
  statusCode: 200,
  message: 'Login successful',
  data: {
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    user: {
      id, email, firstName, lastName,
      companyId, company: { id, name, baseCurrency },
      isPrimaryAdmin, roleId, twoFactorEnabled
    }
  }
}
```
**Response 200 — 2FA required:**
```ts
{
  message: '2FA verification required',
  data: { requires2fa: true, tempToken: string, methods: ['totp' | 'email'] }
}
```
**Response 200 — company selection required:**
```ts
{
  message: 'Please select a company to continue',
  data: { requiresCompanySelection: true, tempToken: string, companies: Array<{ id, name, role }> }
}
```
**Errors:**
- `401` `{ message: 'Invalid credentials' }` → inline form error.
- `429` `{ message: 'Too many attempts' }` → toast with cooldown hint.
- `403` `{ message: 'Account locked' }` → blocking sheet "Contact your admin".

### 5.2 On success — persist tokens
- Save `accessToken` + `refreshToken` to secure keychain.
- Hydrate API client default `Authorization` header.
- Eagerly fetch `GET /auth/my-permissions` and persist (same as Splash flow).

## 6. State & Data Flow

- React Hook Form + Zod schema:
  ```ts
  z.object({
    email: z.string().email(),
    password: z.string().min(1, 'Required')
  })
  ```
- On submit: optimistic UI is **off** (auth must be confirmed). Show button spinner.
- On success: invalidate `['auth','me']` and `['auth','permissions']` query caches.

## 7. Offline Behavior

- Submit blocked while `NetInfo` reports offline → toast "You're offline. Try again when connected."
- Email + password are not cached anywhere.

## 8. Push Triggers

None.

## 9. Edge Cases & Validation

- Trim whitespace from email before submit.
- Show password length-only requirement client-side; rely on server for credential validity.
- After 3 failed attempts, surface "Forgot password?" with extra emphasis.
- Biometric path: if user opted in last session, on screen mount show Face ID/Touch ID prompt; on success, retrieve stored refresh token, call `POST /auth/refresh` to get a new access token, skip login form.
- Keyboard avoidance: form scrolls so the focused input + primary button are always visible.
- `requires2fa` payload includes `methods` — pass into `MFAChallenge` so the screen can show "Email a code instead" if TOTP isn't set up.

## 10. Acceptance Criteria

- [ ] Valid creds → routes to Home and Home renders fresh (not cached) data.
- [ ] Invalid creds → inline error, fields preserved, password masked.
- [ ] 2FA-enabled account → routes to MFAChallenge with `tempToken`.
- [ ] Multi-company account → routes to CompanySelect with `tempToken`.
- [ ] 5 rapid attempts → 429 surfaced with friendly message.
- [ ] Biometric login works on second visit if opted in.
- [ ] Light + dark mockups implemented.
- [ ] Tapping outside dismisses keyboard.
- [ ] Forgot link works.
