# MOBILE_AUTH_FORGOT_PASSWORD

**Screen #:** 3 · **Area:** Auth & Onboarding · **Route key:** `ForgotPassword`
**Design ref:** [Design Brief §1 — Screen 3](../MOBILE_APP_DESIGN_BRIEF.md#screen-3--forgot-password)
**Index ref:** [Master Index §4.1](../MOBILE_APP_SCREENS_INDEX.md#41-auth--onboarding-6-screens)

---

## 1. Screen Purpose

Request a password-reset email. Always shows a generic success UI regardless of whether the email exists (server intentionally does not leak this).

## 2. Wireframe Description

Back arrow top-left. H1 "Reset password". Subtitle "Enter your email and we'll send a reset link". Email input. Full-width Primary "Send Reset Link".

On success, the screen swaps body to a centered checkmark illustration + headline "Check your email" + body copy ("If an account exists with this email, we've sent a reset link.") + secondary button "Open Mail App" + tertiary "Back to Sign In".

## 3. Component Breakdown

| Component | Props / State |
|-----------|---------------|
| `BackButton` | onPress → pop |
| `TextInput` (email) | keyboardType=email-address, autoCapitalize=none |
| `Button` (primary) | loading, disabled when email invalid |
| `SuccessIllustration` | shown after submit |
| `Button` (secondary, "Open Mail App") | iOS: `Linking.openURL('message://')`; Android: open mail intent |

State owned: `email`, `submitting`, `submitted`.

## 4. Navigation

- **Entry:** from Login → "Forgot password?" link.
- **Exit:**
  - Back → Login.
  - "Open Mail App" → external Mail app.
  - "Back to Sign In" → Login.
  - After success state, no auto-route; user navigates manually.
- **Params:** optional `{ prefilledEmail?: string }` (passes the email the user typed on Login).

## 5. Backend Integration

### 5.1 Submit reset request
**Endpoint:** `POST /api/v1/auth/forgot-password`
**Rate limit:** 5 attempts per 60 seconds.
**Body:**
```ts
{ email: string }
```
**Response 200 (always — regardless of whether email exists):**
```ts
{
  status: 'success',
  message: 'If an account exists with this email, you will receive a password reset link',
  data: {
    message: 'If an account exists with this email, you will receive a password reset link',
    emailSent: boolean    // true if account found and email sent; false if not found
  }
}
```
> **Important:** The response is identical in structure whether or not the email exists. The `emailSent` boolean indicates internally whether an email was sent, but the **UI must NOT differentiate** — always show the same success card regardless of `emailSent`. This prevents email enumeration attacks.

**Errors:**
- `429` (throttle) → toast "Too many requests. Try again in a minute."
- `400` invalid email format (caught client-side by Zod before submit).

### 5.2 Password reset token expiry
The reset link sent by email contains a token that expires after **1 hour**. The success card body copy should include: "The link expires in 1 hour."

## 6. State & Data Flow

- No cache. One-shot mutation.
- React Hook Form + Zod: `email: z.string().email()`.
- Always show success card on 200 — do not inspect `emailSent`.

## 7. Offline Behavior

Submit blocked while offline. Toast "You're offline. Try again when connected."

## 8. Push Triggers

None.

## 9. Edge Cases & Validation

- Trim email before submit.
- Disable button while submitting; success state remains until user navigates away.
- **Universal Links / deep link:** tapping the reset link in email opens the app to `ResetPassword` with `?token=<token>` in params (if app installed), or opens web fallback URL.
- **Open Mail App check:** use `Linking.canOpenURL` before attempting — if no mail app installed, show toast "No email app found on this device."

## 10. Acceptance Criteria

- [ ] Valid email → success card displays with consistent message regardless of whether account exists.
- [ ] Invalid email format → inline error shown, no API call made.
- [ ] 429 → friendly cooldown toast.
- [ ] Open Mail App button works on iOS and Android; shows toast if no mail app installed.
- [ ] Light + dark mockups implemented.
