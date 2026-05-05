# MOBILE_AUTH_MFA

**Screen #:** 5 · **Area:** Auth & Onboarding · **Route key:** `MFAChallenge`
**Design ref:** [Design Brief §1 — Screen 5](../MOBILE_APP_DESIGN_BRIEF.md#screen-5--mfa-challenge)
**Index ref:** [Master Index §4.1](../MOBILE_APP_SCREENS_INDEX.md#41-auth--onboarding-6-screens)

---

## 1. Screen Purpose

Second factor verification for users with 2FA enabled. Accepts a 6-digit code from authenticator (TOTP) or email-delivered OTP. On success, completes login and issues access tokens.

## 2. Wireframe Description

Back arrow. H1 "Verify it's you". Subtitle changes based on method: "Enter the 6-digit code from your authenticator app" or "We sent a code to your email a***@example.com". Six single-digit OTP cells with auto-advance and auto-submit when filled. "Resend code" link (disabled with countdown for email method). Below: tertiary link "Use email instead" / "Use authenticator instead" if both methods available. Primary "Verify" button (auto-submit fires, this is the manual fallback).

## 3. Component Breakdown

| Component | Props / State |
|-----------|---------------|
| `BackButton` | onPress → Login (clears tempToken) |
| `OTPInput` (6 cells) | value, onChange, onComplete, autoFocus |
| `CountdownTimer` | seconds remaining for resend (email only) |
| `TextLink` ("Resend code") | disabled while countdown > 0 |
| `TextLink` (method switch) | visible if user has multiple 2FA methods |
| `Button` (primary "Verify") | loading, disabled while < 6 digits |
| `InlineError` | wrong code feedback with shake animation |

State owned: `code`, `submitting`, `serverError`, `methodInUse`, `resendCountdown`.

## 4. Navigation

- **Entry:** from `Login` after a `requires2fa: true` response, with `{ tempToken: string, methods: ('totp'|'email')[] }` params.
- **Exit:**
  - Success → `AppTabs/Home` (or `CompanySelect` if response indicates).
  - Back → `Login` (tempToken discarded).
- **Params:** `{ tempToken: string, methods: string[], maskedEmail?: string }`.

## 5. Backend Integration

### 5.1 Verify code
**Endpoint:** `POST /api/v1/auth/login` (re-used; backend identifies via `tempToken`)
**Body:**
```ts
{ tempToken: string, code: string }
```
**Response 200:**
```ts
{
  statusCode: 200,
  message: 'Login successful',
  data: {
    accessToken, refreshToken, expiresIn,
    user: { ...same as login success }
  }
}
```
or with company-selection requirement (multi-company users with 2FA):
```ts
{ data: { requiresCompanySelection: true, tempToken, companies } }
```
**Errors:**
- `401` `{ message: 'Invalid code' }` → shake + clear cells, focus first cell, inline error.
- `401` `{ message: 'Code expired' }` → toast + auto-resend offer.
- `429` → cooldown toast.

### 5.2 Resend (email method only)
**Endpoint:** `POST /api/v1/auth/resend-2fa`
**Body:** `{ tempToken: string }`
**Response 200:** `{ data: { sent: true, retryAfter: 60 } }`
On success, restart 60s countdown.

> If TOTP-only (authenticator app), resend is hidden — user opens their app.

## 6. State & Data Flow

- One-shot mutation. No cache.
- Auto-submit fires `verify` when 6 digits entered (250ms debounce after last input).
- `tempToken` lives only in route params (never persisted to keychain).

## 7. Offline Behavior

Submit blocked offline.

## 8. Push Triggers

None.

## 9. Edge Cases & Validation

- Auto-paste from clipboard if it matches `^\d{6}$` shape (iOS prompts via `textContentType="oneTimeCode"`; Android via SMS retriever for email-OTP).
- After 5 wrong attempts within 5 min → backend returns 429; show "Too many attempts. Try again in N minutes." and disable inputs.
- Back navigation **always** discards `tempToken` — user must restart login flow.
- Switching methods generates a new `tempToken` (server endpoint TBD if needed; for v1, switching just hits resend with `method` param if backend supports — otherwise hide the switch).
- Respect reduced motion: replace shake with a static red border tint.

## 10. Acceptance Criteria

- [ ] Correct code → routes to Home/CompanySelect with valid session.
- [ ] Wrong code → shake animation, cells cleared, focus reset, inline error.
- [ ] Auto-submit fires on 6th digit.
- [ ] Clipboard auto-paste works on both platforms.
- [ ] Resend disabled with visible countdown for email method.
- [ ] Light + dark mockups implemented.
