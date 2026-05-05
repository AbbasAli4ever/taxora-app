# MOBILE_AUTH_RESET_PASSWORD

**Screen #:** 4 · **Area:** Auth & Onboarding · **Route key:** `ResetPassword`
**Design ref:** [Design Brief §1 — Screen 4](../MOBILE_APP_DESIGN_BRIEF.md#screen-4--reset-password)
**Index ref:** [Master Index §4.1](../MOBILE_APP_SCREENS_INDEX.md#41-auth--onboarding-6-screens)

---

## 1. Screen Purpose

Set a new password using a one-time token delivered by email. Token is validated server-side before showing the form; expired/invalid tokens display a clear error with a "Request a new link" CTA.

## 2. Wireframe Description

H1 "Create new password". Two password inputs (new, confirm), both with show/hide eye. Live strength meter (weak/fair/strong) animates as the user types. Rules checklist below the input — bullets turn green with a checkmark as each is satisfied:
- 8+ characters
- At least one number
- At least one symbol
- New + confirm match

Full-width Primary "Update Password". On success, swap to centered confirmation (checkmark + "Password updated") and auto-route to Login after ~2s.

If token is invalid/expired on mount, show a centered error illustration + "Link expired or invalid" + Primary "Request a new link" → routes to ForgotPassword.

## 3. Component Breakdown

| Component | Props / State |
|-----------|---------------|
| `TextInput` (new password) | secureTextEntry, eye toggle |
| `TextInput` (confirm password) | secureTextEntry, eye toggle |
| `PasswordStrengthMeter` | bound to new password |
| `RuleChecklist` | live-validates rules |
| `Button` (primary) | loading, disabled until all rules met |
| `TokenStatusBanner` | shown if token validation fails |

State owned: `newPassword`, `confirmPassword`, `tokenValid`, `submitting`, `submitted`.

## 4. Navigation

- **Entry:**
  - Universal Link / deep link from email: `finanx://reset-password?token=<token>`.
  - Web fallback URL also opens the app if installed (handled by associated domains config).
- **Exit:**
  - Success → `Login` (2s auto-route, with toast "Password updated").
  - Invalid/expired token → "Request new link" → `ForgotPassword`.
- **Params:** `{ token: string }` (required).

## 5. Backend Integration

### 5.1 Validate token on mount
**Endpoint:** `GET /api/v1/auth/validate-reset-token?token=<token>`
**Response 200:**
```ts
{ data: { valid: boolean, email?: string, expiresAt?: string } }
```
If `valid: false` → show error state. Do not render form.

### 5.2 Submit new password
**Endpoint:** `POST /api/v1/auth/reset-password`
**Body:**
```ts
{ token: string, newPassword: string }
```
**Response 200:**
```ts
{ statusCode: 200, message: 'Password reset successful', data: { success: true } }
```
**Errors:**
- `400` `{ message: 'Token expired' | 'Token invalid' }` → swap to error state.
- `400` `{ message: 'Password does not meet requirements' }` → inline form error.
- `429` Too many attempts → toast cooldown.

## 6. State & Data Flow

- React Hook Form + Zod schema enforcing password rules (regex for digit + symbol).
- No server cache concerns; one-shot mutation.
- After success, clear any in-memory auth state and force a fresh login.

## 7. Offline Behavior

Submit blocked while offline. Token validation also requires network — show "You're offline" state with retry.

## 8. Push Triggers

None.

## 9. Edge Cases & Validation

- Token absent in deep link params → route to ForgotPassword with toast "Open the link from your email".
- Treat token validation as **load gate**: show skeleton while validating; do not flash the form.
- After success, the user must log in fresh — do NOT auto-issue a session from the reset endpoint.
- Strength meter is informational only; the rule checklist is the actual gate.

## 10. Acceptance Criteria

- [ ] Valid token → form renders, strength meter live-updates, rules checklist becomes all-green when valid.
- [ ] Submit with mismatched confirm → inline error, button disabled.
- [ ] Expired token → error illustration + "Request new link" CTA works.
- [ ] On success, brief confirmation then routes to Login; user can log in with new password.
- [ ] Light + dark mockups implemented.
