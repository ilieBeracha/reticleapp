# Plan: Phone OTP Login with Supabase

Add phone-based OTP sign-in alongside the existing email OTP flow. Mirrors the existing pattern exactly.

## Files to Modify

| File | Action |
|------|--------|
| `services/authService.ts` | Add `signInWithPhoneOtp` + `verifyPhoneOtp` |
| `lib/i18n/locales/en.json` | Add phone auth translation keys |
| `lib/i18n/locales/he.json` | Add phone auth translation keys |
| `components/auth/PhoneOTPSheet.tsx` | **Create** - phone OTP modal (mirrors EmailOTPSheet) |
| `modules/auth/SignIn.tsx` | Add "Continue with Phone" button + PhoneOTPSheet |

No changes needed to `AuthContext.tsx` — the existing `onAuthStateChange` listener handles `SIGNED_IN` events generically. EmailOTPSheet also imports directly from the service, not from context.

## Step 1: Auth Service (`services/authService.ts`)

Add after the existing email OTP section (after line 168):

- `signInWithPhoneOtp(phone)` — calls `supabase.auth.signInWithOtp({ phone })`
- `verifyPhoneOtp(phone, token)` — calls `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`

Both follow the exact same pattern as the email equivalents: trim input, throw `AuthenticationError` on failure.

## Step 2: i18n Keys (`lib/i18n/locales/en.json` + `he.json`)

Add to the `auth` section (after line 129 in both files):

```json
"phone": "Phone Number",
"enterPhone": "Please enter your phone number",
"enterPhoneForCode": "Enter your phone number to receive a one-time code via SMS",
"checkYourPhone": "Check Your Phone",
"smsSentTo": "We sent a 6-digit code to {{phone}}",
"sendSmsFailed": "Failed to send SMS code",
"continueWithPhone": "Continue with Phone"
```

Existing keys reused: `signIn`, `enterCode`, `enterCodeSentTo`, `verificationCode`, `invalidCode`, `sendCode`, `verifyAndSignIn`, `resendCode`.

## Step 3: PhoneOTPSheet Component (`components/auth/PhoneOTPSheet.tsx`)

New file, structurally identical to `EmailOTPSheet.tsx`. Differences:

- State: `phone` instead of `email`, steps are `"phone" | "otp"`
- Service calls: `signInWithPhoneOtp` / `verifyPhoneOtp`
- Input: `keyboardType="phone-pad"`, `autoComplete="tel"`, placeholder `"+1 (555) 000-0000"`
- Icons: `"call"` / `"call-outline"` instead of `"mail"` / `"mail-outline"`
- Phone-specific translation keys

## Step 4: SignIn Screen (`modules/auth/SignIn.tsx`)

- Import `PhoneOTPSheet`
- Add `showPhoneOTP` state
- Add "Continue with Phone" button below the email button (reuse `styles.emailButton` with `marginTop: 12`)
- Render `<PhoneOTPSheet visible={showPhoneOTP} onClose={...} />`

## Prerequisite (Manual)

Phone OTP requires an SMS provider enabled in the Supabase dashboard:
- Dashboard > Authentication > Providers > Phone
- Configure Twilio, MessageBird, or Vonage

## Verification

1. Run `npx expo start` and open the app
2. Navigate to sign-in screen — confirm "Continue with Phone" button appears below email
3. Tap "Continue with Phone" — verify the modal opens with phone number input
4. Enter a phone number and tap "Send Code" — verify the API call fires (will fail without SMS provider configured, but should not crash)
5. Verify i18n works by switching to Hebrew
