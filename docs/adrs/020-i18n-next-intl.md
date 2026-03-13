# ADR-020: Internationalization with next-intl (Non-Routing Mode)

**Date**: 2026-03-13
**Status**: Accepted
**Feature**: i18n / Display Language (#37)

## Context

AlumNet serves PTNK alumni who are predominantly Vietnamese but may use English as their preferred interface language. The platform needs bilingual support (Vietnamese and English) for all UI text. Key constraints:

- The app is fully authenticated — SEO on interior pages is not a concern.
- Clean URLs are preferred (no `/en/dashboard` or `/vi/dashboard` prefixes).
- Language preference should persist across sessions and devices (DB-backed for authenticated users).
- The codebase uses Next.js App Router with a mix of Server Components and Client Components.

## Options Considered

### Option A: next-intl (Non-Routing Mode)

- **Description**: Use the `next-intl` library in non-routing mode. Locale is determined by a `NEXT_LOCALE` cookie (not URL segments). Messages are JSON files loaded via `getRequestConfig`. Server Components use `getTranslations()`, Client Components use `useTranslations()`.
- **Pros**: Native App Router and Server Component support. Type-safe message keys with IDE autocompletion. ICU message format for plurals and interpolation. Minimal configuration — no routing changes, no `[locale]` segment needed. Well-maintained, widely adopted in the Next.js ecosystem.
- **Cons**: Adds a dependency (~30 KB). Non-routing mode is less documented than the routing mode.

### Option B: Custom React Context + JSON Files

- **Description**: Build a custom `LocaleProvider` context, load JSON translation files manually, and provide a `useT()` hook.
- **Pros**: Zero dependencies. Full control over implementation.
- **Cons**: No Server Component support (context is client-only). Must reimplement ICU plurals, interpolation, and nested key resolution. No type safety without significant extra work. Maintenance burden for features that libraries already solve.

### Option C: react-i18next

- **Description**: Use `react-i18next` with `i18next` as the translation engine.
- **Pros**: Mature ecosystem, extensive plugin library, ICU support via plugins.
- **Cons**: Designed primarily for client-side React — Server Component integration requires workarounds and additional packages (`next-i18next` was archived for App Router). Heavier bundle. More complex configuration with namespaces, backends, and detection plugins.

## Decision

**Option A** — `next-intl` in non-routing mode with cookie-based locale detection.

next-intl is purpose-built for Next.js App Router and treats Server Components as first-class citizens. The non-routing mode avoids URL changes, which is appropriate for an authenticated app where locale is a user preference rather than content segmentation. ICU message format handles plurals and interpolation cleanly (already used for counts like `"{count, plural, one {# user} other {# users}}"`). Cookie-based detection pairs naturally with DB persistence for authenticated users.

## Consequences

- **All new UI strings must be added to both `en.json` and `vi.json`** — missing a translation key in either file will cause a runtime fallback to the key name.
- **DB-stored taxonomy data is not translated** — industry names, specialization names, and availability tags remain in their original language as entered by admins. Translating database content is deferred to a future phase.
- **Email templates are not translated** — transactional emails (verification, password reset, notifications) are English-only for now.
- **Audit log action labels are not translated** — these are internal/admin-facing and remain in English.
- The `NEXT_LOCALE` cookie introduces a small overhead on every request (cookie read in `getRequestConfig`), which is negligible.

## References

- next-intl docs (non-routing mode): https://next-intl.dev/docs/getting-started/app-router/without-i18n-routing
- Migration: `supabase/migrations/00032_add_preferred_language.sql`
- Config: `src/i18n/config.ts`, `src/i18n/request.ts`
- Messages: `src/i18n/messages/en.json`, `src/i18n/messages/vi.json`
