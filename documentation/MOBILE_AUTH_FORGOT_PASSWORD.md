# MOBILE_AUTH_FORGOT_PASSWORD

**Screen #:** 3 · **Area:** Auth & Onboarding · **Route key:** `ForgotPassword`
**Design ref:** [Design Brief §1 — Screen 3](../MOBILE_APP_DESIGN_BRIEF.md#screen-3--forgot-password)
**Index ref:** [Master Index §4.1](../MOBILE_APP_SCREENS_INDEX.md#41-auth--onboarding-6-screens)

---

## 1. Screen Purpose

Request a password-reset email. Always returns a generic success response (server does not leak whether the email exists).

## 2. Wireframe Description

Back arrow top-left. H1 "Reset password". Subtitle "Enter your email and we'll send a reset link". Email input. Full-width Primary "Send Reset Link". On success, the screen swaps body to a centered checkmark illustration + headline "Check your email" + body copy + secondary button "Open Mail App" + tertiary "Back to Sign In".

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
  - "Open Mail App" → external Mail.
  - After success state, no auto-route; user goes back manually.
- **Params:** optional `{ prefilledEmail?: string }` (passes the value the user typed on Login).

## 5. Backend Integration

### 5.1 Submit reset request
**Endpoint:** `POST /api/v1/auth/forgot-password`
**Body:**
```ts
{ email: string }
```
**Response 200:**
```ts
{
  statusCode: 200,
  message: 'If the email exists, a reset link has been sent',
  data: { sent: true }
}
```
**Errors:**
- `429` Too many requests → toast "Try again in a minute".
- `400` invalid email format → inline field error.

> The endpoint is intentionally non-revealing — same response whether the email exists or not. The UI must NOT imply success means an account exists.

## 6. State & Data Flow

- No cache. One-shot mutation.
- React Hook Form + Zod (`email: z.string().email()`).

## 7. Offline Behavior

Submit blocked while offline. Toast "You're offline. Try again when connected."

## 8. Push Triggers

None.

## 9. Edge Cases & Validation

- Trim email before submit.
- Disable button while submitting; success state remains until user navigates away.
- Universal Links / Email deep link: tapping the reset link in email should open the app to `ResetPassword` with the token in params (if app installed) or the web fallback URL.

## 10. Acceptance Criteria

- [ ] Valid email → success card displays, primary button shows loading then resolves.
- [ ] Invalid email format → inline error, no API call.
- [ ] 429 → friendly cooldown toast.
- [ ] Open Mail App opens on iOS and Android.
- [ ] Light + dark mockups implemented.
