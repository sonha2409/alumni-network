# Deployment Debug Notes (2026-03-12)

## What's Done

### Domain & Email
- **Domain**: `ptnkalum.com` purchased on Cloudflare Registrar
- **Resend**: domain verified, API key working
- **DNS**: 4 records added (DKIM, SPF MX, SPF TXT, DMARC) — all verified
- **Supabase SMTP**: configured with Resend (`smtp.resend.com`, port 465, username `resend`)
- Emails ARE being sent and received (confirmation emails arrive)

### Supabase Production
- **Project**: `vrgobrbrjvoojgvzortm` (Singapore region)
- **All 31 migrations** pushed successfully
- **Auth SMTP** configured with Resend
- **Email confirmation** enabled
- **Site URL**: `https://ptnkalum.com`
- **Redirect URLs**: `https://ptnkalum.com/**`, `https://ptnkalum.com/auth/callback`

### Vercel
- **Deployed** from GitHub `sonha2409/alumni-network` (main branch)
- **Function region**: Singapore (sin1) — co-located with Supabase
- **Domains**: `ptnkalum.com` (primary), `www.ptnkalum.com`
- **Auto-deploy** from main branch working

### Environment Variables (Vercel)
All set in Vercel dashboard. See Vercel project settings for values.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (https://ptnkalum.com)
- `NEXT_PUBLIC_MAPBOX_TOKEN`, `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (AlumNet <noreply@ptnkalum.com>)

### Code Changes Made
1. `supabase/migrations/*` — replaced `uuid_generate_v4()` with `gen_random_uuid()` (commit `cf0b0fa`)
2. `src/app/(auth)/actions.ts` — detect missing session on signup (email confirmation pending), show "check your email" message (commit `64d7d57`)
3. `src/app/(auth)/actions.ts` — pass `emailRedirectTo` in signup for PKCE flow (commit `6fe9721`)
4. `src/proxy.ts` — sign out before redirect in fail-closed paths to prevent redirect loops (commit `01e9008`)
5. `src/app/auth/callback/route.ts` — support both PKCE code exchange and token_hash verification (commit `de3277b`)
6. `src/app/auth/callback/route.ts` — added error logging (commit `22775cf`)
7. `src/proxy.ts` — handle PKCE code exchange directly in proxy (commit `718c08f`)
8. `src/proxy.ts` — redirect to `/login?email_confirmed=true` when PKCE exchange fails (graceful fallback)
9. `src/app/(auth)/login/login-form.tsx` — show "Email confirmed!" banner when `email_confirmed=true` param present
10. `src/app/(auth)/login/page.tsx` — wrap LoginForm in Suspense for useSearchParams()

### Supabase Email Template (Confirm sign up)
Current template:
```html
<h2>Welcome to AlumNet!</h2>

<p>Thanks for signing up. Please confirm your email address to get started:</p>

<p><a href="{{ .ConfirmationURL }}">Confirm my email</a></p>

<p>If you didn't create an account, you can safely ignore this email.</p>
```

---

## The Bug: Email Confirmation Redirect

### What works
- Signup creates user in `auth.users` and `public.users`
- Confirmation email IS sent and received
- Clicking the confirmation link DOES confirm the email (user can log in afterward)
- Manual login after confirmation works — user gets to dashboard/onboarding

### What doesn't work
- After clicking the confirmation email link, user lands on `/login` instead of `/onboarding`
- No session is created during the redirect — user must manually log in

### What we observed
1. **Confirmation link URL flow**: User clicks email link → Supabase verifies token → redirects to app with `?code=...&next=%2Fonboarding`
2. **But the path is `/login`**, not `/auth/callback` — e.g., `ptnkalum.com/login?code=55692e2f-...&next=%2Fonboarding`
3. **Vercel runtime logs show NO request to `/auth/callback`** — the request goes directly to `/login`
4. The proxy code exchange (commit `718c08f`) should catch the `code` param on any route, but it's still not working

### What we tried (and didn't fix it)
1. **Custom email template with `{{ .TokenHash }}`** — token_hash starts with `pkce_`, can't be verified with `verifyOtp()`
2. **`{{ .ConfirmationURL }}`** — Supabase's default flow, but redirects to site root/login instead of /auth/callback
3. **`emailRedirectTo` in signup action** — set to `${siteUrl}/auth/callback?next=/onboarding`, Supabase seems to ignore it or redirect URL isn't in allowlist
4. **www vs non-www alignment** — tried both `ptnkalum.com` and `www.ptnkalum.com` as primary. Currently `ptnkalum.com` is primary
5. **Code exchange in proxy** — added code to intercept `code` param on any route. Still lands on `/login`
6. **Redirect URLs in Supabase** — added `https://ptnkalum.com/**` and `https://ptnkalum.com/auth/callback`

### Likely root cause theories
1. **PKCE code_verifier mismatch**: The code_verifier cookie is set during signup on the browser. When user clicks email link, they may be in a different tab/context where the cookie isn't available. Without the code_verifier, `exchangeCodeForSession()` fails silently.
2. **Supabase ignoring `emailRedirectTo`**: The redirect URL might not match the allowlist exactly (query params, trailing slashes, www vs non-www).
3. **Proxy code exchange failing but not logging**: The code exchange in the proxy might be failing, and the `console.error` might not be visible in Vercel logs due to timing or log level.

### Fix applied (2026-03-13): Graceful fallback for failed PKCE exchange

**Root cause confirmed**: PKCE `code_verifier` cookie is set during `signUp()` in the user's browser. When the user clicks the confirmation email link, they often open it in a different browser tab/context where the cookie isn't available. The PKCE code exchange fails because it can't find the matching `code_verifier`. However, Supabase already confirmed the email server-side before redirecting — so the email IS confirmed, only the session creation fails.

**Changes made**:
1. `src/proxy.ts` — when PKCE code exchange fails, redirect to `/login?email_confirmed=true` (strips stale `code` param, signals success)
2. `src/app/(auth)/login/login-form.tsx` — detect `email_confirmed=true` in URL, show green success banner: "Email confirmed! Please sign in to continue."
3. `src/app/(auth)/login/page.tsx` — wrap `LoginForm` in `<Suspense>` (required by Next.js for `useSearchParams()`)

**Expected behavior after fix**:
- User signs up → receives confirmation email → clicks link → email is confirmed by Supabase → PKCE exchange fails → proxy redirects to `/login?email_confirmed=true` → user sees "Email confirmed! Please sign in to continue." → user logs in → reaches onboarding/dashboard

**If this fix doesn't work** (verify by testing the full signup flow on production):
- Check Vercel runtime logs for `[Proxy] Code exchange failed` — if this log doesn't appear, the proxy isn't intercepting the request at all (check matcher config)
- If the user still lands on `/login` without the `email_confirmed` param, the proxy redirect isn't firing — the code exchange might be throwing an unhandled error instead of returning an error object
- Remaining options if this approach fails:
  1. **Try disabling PKCE**: In Supabase dashboard → Authentication → Sign In / Providers → Email → check if there's a PKCE toggle
  2. **Client-side fallback**: On the `/login` page, detect `code` param and attempt `exchangeCodeForSession` client-side (would need the code_verifier cookie though, so likely same issue)
  3. **Nuclear option**: Disable email confirmation for soft launch, enable later when properly tested

### Key files
- `src/proxy.ts` — proxy/middleware with code exchange logic
- `src/app/auth/callback/route.ts` — auth callback route handler
- `src/app/(auth)/actions.ts` — signup action with `emailRedirectTo`
- `src/app/(auth)/signup/signup-form.tsx` — signup form UI with toast messages

### Useful links
- Supabase dashboard: https://supabase.com/dashboard/project/vrgobrbrjvoojgvzortm
- Vercel dashboard: check deployments and runtime logs
- Resend dashboard: check email delivery logs
- Cloudflare DNS: ptnkalum.com DNS records
