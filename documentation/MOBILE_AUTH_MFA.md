# MOBILE_AUTH_MFA

**Screen #:** 5 · **Area:** Auth & Onboarding · **Route key:** `MFAChallenge`
**Design ref:** [Design Brief §1 — Screen 5](../MOBILE_APP_DESIGN_BRIEF.md#screen-5--mfa-challenge)
**Index ref:** [Master Index §4.1](../MOBILE_APP_SCREENS_INDEX.md#41-auth--onboarding-6-screens)

---

## 1. Screen Purpose

Second factor verification for users with 2FA enabled. Accepts a 6-digit TOTP code from an authenticator app, or an 8-character backup code. On success, completes login and issues access tokens.

> **v1 scope:** Only TOTP (authenticator app) + backup codes are supported. There is no email-OTP method. The `POST /auth/resend-2fa` endpoint does **not exist** in the backend — do not implement resend functionality.

## 2. Wireframe Description

Back arrow. H1 "Verify it's you". Subtitle: "Enter the 6-digit code from your authenticator app".

Six single-digit OTP cells with auto-advance and auto-submit when filled. Primary "Verify" button (auto-submit fires on 6th digit; this is the manual fallback).

Below the OTP cells: tertiary link "Use a backup code instead" — tapping switches the input to a single text field accepting an 8-character backup code.

## 3. Component Breakdown

| Component | Props / State |
|-----------|---------------|
| `BackButton` | onPress → Login (clears tempToken) |
| `OTPInput` (6 cells) | value, onChange, onComplete, autoFocus — for TOTP mode |
| `TextInput` (backup code) | shown when `useBackupCode === true`, single field, max 8 chars |
| `TextLink` ("Use a backup code instead") | toggles mode |
| `TextLink` ("Use authenticator code instead") | toggles back |
| `Button` (primary "Verify") | loading, disabled while input incomplete |
| `InlineError` | wrong code feedback with shake animation |

State owned: `code`, `isBackupCode`, `submitting`, `serverError`.

## 4. Navigation

- **Entry:** from `Login` after a `requires2fa: true` response, with `{ tempToken: string }` params.
- **Exit:**
  - Success → `AppTabs/Home` (or `CompanySelect` if response indicates multi-company).
  - Back → `Login` (tempToken discarded).
- **Params:** `{ tempToken: string }`.

## 5. Backend Integration

### 5.1 Verify TOTP code
**Endpoint:** `POST /api/v1/auth/verify-2fa`
**Body:**
```ts
{
  tempToken: string,    // from login response, expires in 5 minutes
  token: string,        // 6-digit TOTP code from authenticator app
  isBackupCode?: boolean  // omit or false for TOTP; true when using backup code
}
```

**When using backup code:**
```ts
{
  tempToken: string,
  token: string,        // 8-character backup code
  isBackupCode: true
}
```

**Response 200 — success (single company):**
```ts
{
  status: 'success',
  message: '2FA verified — login successful',
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

**Response 200 — company selection required (multi-company user with 2FA):**
```ts
{
  status: 'success',
  message: 'Please select a company to continue',
  data: {
    requiresCompanySelection: true,
    tempToken: string,
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

**Errors:**
- `401` `{ message: 'Invalid or expired 2FA token. Please login again.' }` → tempToken expired (5 min window) → toast + navigate back to Login.
- `401` `{ message: 'Invalid token purpose' }` → wrong token type → toast + navigate back to Login.
- `401` `{ message: '2FA is not enabled for this account' }` → should not reach here; navigate back to Login.
- `401` `{ message: 'Invalid 2FA code' }` → wrong TOTP code → shake + clear cells + inline error.
- `401` `{ message: 'Invalid backup code' }` → wrong backup code → shake + clear field + inline error.
- `401` `{ message: 'Account is deactivated' }` → blocking alert + navigate to Login.

> **No resend endpoint exists.** If the tempToken expires (5-minute window), the user must go back to Login and start over. Show a countdown timer from the moment this screen is entered so users know how long they have.

### 5.2 On success — persist tokens
Same as Login success:
- Save `accessToken` + `refreshToken` to keychain.
- Hydrate API client `Authorization` header.
- Persist `permissions` from response into Zustand.

## 6. State & Data Flow

- One-shot mutation. No cache.
- **TOTP mode:** Auto-submit fires when 6 digits entered (250ms debounce).
- **Backup code mode:** Submit fires on button tap only (no auto-submit — user must tap Verify).
- `tempToken` lives only in route params — never persisted to keychain.
- On success: set `['auth','me']` and `['auth','permissions']` query caches from response data.

## 7. Offline Behavior

Submit blocked offline. Toast "You're offline. Try again when connected."

## 8. Push Triggers

None.

## 9. Edge Cases & Validation

- **5-minute tempToken expiry:** show a countdown timer on screen. When it reaches 0, disable inputs and show "Your session expired. Go back and sign in again." with a Back to Login button.
- **Auto-paste from clipboard:** if clipboard matches `^\d{6}$` → auto-fill OTP cells (iOS via `textContentType="oneTimeCode"`).
- **Backup code format:** 8 alphanumeric characters. Show placeholder "XXXXXXXX". No auto-submit — user taps Verify.
- **Back navigation always discards tempToken** — user must restart full login flow.
- **Wrong code:** shake animation on OTP cells, clear all cells, focus first cell, show inline error. On backup code: clear field, show inline error.
- **Reduced motion:** replace shake animation with static red border tint.
- **Company selection after 2FA:** if response has `requiresCompanySelection: true`, navigate to `CompanySelect` with `{ mode: 'post-login', tempToken, companies }` passing `companyId`/`companyName` field names from response.

## 10. Acceptance Criteria

- [ ] Correct TOTP code → routes to Home/CompanySelect with valid session.
- [ ] Correct backup code (with `isBackupCode: true`) → routes to Home/CompanySelect.
- [ ] Wrong code → shake animation, cells cleared, focus reset, inline error.
- [ ] Auto-submit fires on 6th digit in TOTP mode.
- [ ] Backup code mode: single text input, submit on button tap only.
- [ ] Clipboard auto-paste works for 6-digit codes.
- [ ] 5-minute countdown timer visible; inputs disabled + message shown at 0.
- [ ] Expired tempToken (401) → toast + navigate back to Login.
- [ ] Back navigation discards tempToken and goes to Login.
- [ ] Light + dark mockups implemented.
