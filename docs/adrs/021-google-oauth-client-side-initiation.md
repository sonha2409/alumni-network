# ADR-021: Google OAuth — Client-Side Initiation

**Date**: 2026-03-13
**Status**: Accepted
**Feature**: Google OAuth (Sign in with Google) — F1b

## Context

Feature #41 adds Google OAuth as a sign-in/sign-up method. The implementation needs to decide:

1. **How to initiate the OAuth flow** — client-side via `supabase.auth.signInWithOAuth()` or server-side via a Server Action.
2. **Which OAuth provider to start with** — Google, LinkedIn, or both.
3. **How to handle users who sign up with Google but already have an email/password account** — reject, prompt, or auto-link.

Constraints:
- The project uses Supabase Auth with PKCE flow.
- The existing `/auth/callback` route and `proxy.ts` already handle code exchange and session refresh.
- The `handle_new_user()` trigger already creates `public.users` rows on signup.
- The project convention (per CLAUDE.md) is to prefer Server Actions for mutations over API routes.

## Options Considered

### Option A: Client-Side OAuth via `signInWithOAuth()`

- **Description**: Call `supabase.auth.signInWithOAuth({ provider: 'google' })` from a client component. Supabase JS handles PKCE code_verifier storage and constructs the redirect URL. The browser navigates to Google's consent screen, then back to `/auth/callback`.
- **Pros**: Standard Supabase pattern, well-documented. PKCE code_verifier is automatically stored in the browser (required for the callback exchange). Minimal code — one function call. No new server-side routes or actions.
- **Cons**: Requires a `"use client"` component (but the button needs `onClick` anyway).

### Option B: Server Action Initiating OAuth

- **Description**: Create a Server Action that generates the OAuth URL via Supabase Admin API, then redirect the user.
- **Pros**: Follows the project's "prefer Server Actions" convention.
- **Cons**: OAuth PKCE flow requires the `code_verifier` to be stored in the browser's session storage — a Server Action cannot do this. Would need to manually implement PKCE state management, duplicating what the Supabase JS client already handles. More code, more surface area for bugs. Not the intended usage pattern for Supabase OAuth.

### Option C: Popup-Based OAuth

- **Description**: Open Google consent screen in a popup window instead of a full-page redirect.
- **Pros**: User stays on the login page, slightly smoother UX.
- **Cons**: Blocked by most pop-up blockers. Poor mobile experience. More complex state management (cross-window communication). Not supported by Supabase's `signInWithOAuth` without custom implementation.

## Decision

**Option A: Client-side OAuth via `signInWithOAuth()`**.

The "prefer Server Actions" convention applies to data mutations, not browser-redirect flows. OAuth initiation is fundamentally a client-side concern because:

1. The PKCE `code_verifier` must be stored in the browser's session storage for the callback to work.
2. The user's browser must navigate to Google's consent screen — this is a redirect, not a form submission.
3. Supabase's JS client is specifically designed for this pattern and handles all PKCE details automatically.

**Google as the first (and currently only) provider** because:
- Nearly all alumni have Google accounts, maximizing adoption.
- Google OAuth is the simplest to configure and test.
- LinkedIn OAuth can be added later using the same pattern with minimal effort.

**Auto-linking for matching email addresses** because:
- Supabase Auth handles this natively when configured (merging identities under one `auth.users` row).
- It prevents duplicate `public.users` rows and the confusion of having two accounts for one person.
- The user experience is seamless — sign in with Google and all existing data is preserved.

## Consequences

- The `GoogleSignInButton` is a `"use client"` component. This is acceptable since it requires an `onClick` handler regardless.
- No new Server Actions, API routes, or migrations were needed. The existing auth infrastructure (callback route, proxy, `handle_new_user` trigger) works unchanged.
- Adding future OAuth providers (LinkedIn, GitHub) follows the same pattern: new button component + Supabase provider config. No architectural changes needed.
- Auto-linking means users cannot have separate accounts for the same email. This is intentional — the platform is single-school and one person should have one account.

## References

- [Supabase OAuth documentation](https://supabase.com/docs/guides/auth/social-login)
- [Supabase PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- ADR-001: Auth companion table (`public.users` pattern)
- `FEATURES.md` — F1b: Google OAuth requirements
