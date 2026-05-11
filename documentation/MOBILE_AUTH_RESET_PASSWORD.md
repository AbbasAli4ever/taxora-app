# MOBILE_AUTH_RESET_PASSWORD

**Screen #:** 4 · **Area:** Auth & Onboarding · **Route key:** `ResetPassword`
**Design ref:** [Design Brief §1 — Screen 4](../MOBILE_APP_DESIGN_BRIEF.md#screen-4--reset-password)
**Index ref:** [Master Index §4.1](../MOBILE_APP_SCREENS_INDEX.md#41-auth--onboarding-6-screens)

---

## 1. Screen Purpose

Set a new password using a one-time token delivered by email. Token is validated server-side before showing the form; expired/invalid tokens display a clear error with a "Request a new link" CTA. Token expires after **1 hour**.

## 2. Wireframe Description

H1 "Create new password". Two password inputs (new, confirm), both with show/hide eye. Live strength meter (weak/fair/strong) animates as the user types. Rules checklist below the input — bullets turn green with a checkmark as each is satisfied:

- 8+ characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (`@$!%*?&`)
- New + confirm match

Full-width Primary "Update Password". On success, swap to centered confirmation (checkmark + "Password updated") and auto-route to Login after ~2s.

If token is invalid/expired on mount, show a centered error illustration + "Link expired or invalid" + Primary "Request a new link" → routes to ForgotPassword.

## 3. Component Breakdown

| Component | Props / State |
|-----------|---------------|
| `TextInput` (new password) | secureTextEntry, eye toggle |
| `TextInput` (confirm password) | secureTextEntry, eye toggle |
| `PasswordStrengthMeter` | bound to new password |
| `RuleChecklist` | live-validates all 5 rules |
| `Button` (primary) | loading, disabled until all rules met + passwords match |
| `TokenStatusBanner` | shown if token validation fails |

State owned: `newPassword`, `confirmPassword`, `tokenValid`, `submitting`, `submitted`.

## 4. Navigation

- **Entry:**
  - Universal Link / deep link from email: `finanx://reset-password?token=<token>`.
  - Web fallback URL also opens the app if installed (handled by associated domains config).
- **Exit:**
  - Success → `Login` (2s auto-route, with toast "Password updated. Please sign in.").
  - Invalid/expired token → "Request new link" → `ForgotPassword`.
- **Params:** `{ token: string }` (required).

## 5. Backend Integration

### 5.1 Validate token on mount
**Endpoint:** `GET /api/v1/auth/validate-reset-token?token=<token>`
**Response 200 — valid:**
```ts
{
  status: 'success',
  message: 'Token is valid',
  data: {
    valid: true,
    email: string    // masked email e.g. "ha***@swiftnine.com" — show to user for confirmation
  }
}
```
**Response 200 — invalid or expired:**
```ts
{
  status: 'success',
  message: 'Token is invalid or expired',
  data: { valid: false }
}
```
**Response 200 — no token provided:**
```ts
{
  status: 'success',
  message: 'Token is required',
  data: { valid: false }
}
```
If `valid: false` → show error state immediately. Do not render the form.

### 5.2 Submit new password
**Endpoint:** `POST /api/v1/auth/reset-password`
**Rate limit:** 5 attempts per 60 seconds.
**Body:**
```ts
{
  token: string,         // plain token from URL params — NOT hashed
  newPassword: string    // must meet ALL complexity rules below
}
```

**Password complexity (server-enforced):**
- Minimum 8 characters
- At least one uppercase letter (A–Z)
- At least one lowercase letter (a–z)
- At least one number (0–9)
- At least one special character from: `@$!%*?&`

**Response 200:**
```ts
{
  status: 'success',
  message: 'Password has been reset successfully. Please login with your new password.',
  data: {
    message: 'Password has been reset successfully. Please login with your new password.'
  }
}
```

**Errors:**
- `400` `{ message: 'Invalid or expired password reset token' }` → swap to error state with "Request new link" CTA.
- `400` `{ message: 'Password must be at least 8 characters long' }` → inline form error.
- `400` `{ message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' }` → inline form error.
- `429` → toast "Too many attempts. Try again later."

> **Multi-company note:** password reset updates the password across ALL companies the user belongs to (same email = same password hash synchronized). This is by design — inform the user in the success message if relevant.

## 6. State & Data Flow

- React Hook Form + Zod schema enforcing all 5 password rules client-side:
  ```ts
  z.object({
    newPassword: z.string()
      .min(8)
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[a-z]/, 'Must contain lowercase')
      .regex(/[0-9]/, 'Must contain number')
      .regex(/[@$!%*?&]/, 'Must contain special character (@$!%*?&)'),
    confirmPassword: z.string()
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  })
  ```
- No server cache concerns; one-shot mutation.
- After success: clear any in-memory auth state; do NOT auto-issue a session — force a fresh login.

## 7. Offline Behavior

Submit blocked while offline. Token validation also requires network — show "You're offline. Connect to validate your reset link." with a Retry button.

## 8. Push Triggers

None.

## 9. Edge Cases & Validation

- **Token absent in deep link params** → `valid: false` path → show error state with "Request new link" CTA. Do not call validate endpoint.
- **Treat token validation as load gate:** show skeleton/spinner while validating. Do not flash the form then replace with error state.
- **Masked email display:** show the masked email from `validate-reset-token` response (e.g. "ha***@swiftnine.com") in the form header so user knows which account they're resetting.
- **Special characters:** only `@$!%*?&` are accepted by the server. The rule checklist must reflect exactly these characters — not a generic "special character" hint.
- **Strength meter** is informational only; all 5 rules in the checklist must be green before the Submit button enables.
- **1-hour token expiry:** if user spends too long on the form, the submit will return `400 Invalid or expired token`. Handle gracefully by swapping to error state with "Request new link".

## 10. Acceptance Criteria

- [ ] Valid token → masked email shown, form renders, strength meter live-updates, all 5 rules in checklist go green when met.
- [ ] Submit with mismatched confirm → inline error, button stays disabled.
- [ ] Submit with password missing any rule → inline error per rule.
- [ ] Expired/invalid token on mount → error illustration shown immediately, form never rendered.
- [ ] "Request new link" CTA on error state → routes to ForgotPassword.
- [ ] On success → brief confirmation message then auto-routes to Login after 2s.
- [ ] User can sign in with new password after reset.
- [ ] Light + dark mockups implemented.
