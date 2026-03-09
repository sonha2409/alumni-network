# ADR-002: Use Security Definer Function for Admin RLS Checks

**Date**: 2026-03-09
**Status**: Accepted
**Feature**: Industry Taxonomy, applies to all tables with admin policies

## Context

Admin RLS policies need to verify the current user's role by querying `public.users`. However, `public.users` itself has RLS enabled with an admin policy that also queries `public.users`, creating infinite recursion.

This was discovered when testing taxonomy table RLS: `SET role = 'anon'; SELECT * FROM industries` triggered `ERROR: infinite recursion detected in policy for relation "users"`.

The issue affects every table that uses admin-check policies following the original pattern from migration 00001.

## Options Considered

### Option A: Security Definer Function (`is_admin()`)

- **Description**: Create `public.is_admin()` as `security definer` — runs as the function owner (postgres), bypassing RLS on `public.users` for the admin check.
- **Pros**: Clean, reusable, single source of truth for admin checks. Standard Supabase pattern.
- **Cons**: Security definer functions need careful auditing — they bypass RLS by design.

### Option B: Check JWT Claims Directly

- **Description**: Use `auth.jwt() ->> 'role'` or custom claims instead of querying the users table.
- **Pros**: No subquery, no recursion risk. Fast.
- **Cons**: Requires syncing role to JWT claims (custom hook or Supabase Auth hook). Role changes don't take effect until token refresh. Adds auth complexity.

### Option C: Separate Admin Check Table

- **Description**: Create a `user_roles` table without RLS, used only for policy checks.
- **Pros**: Avoids recursion without security definer.
- **Cons**: Data duplication. Must keep in sync with `public.users.role`. Over-engineered for this use case.

## Decision

**Option A: Security Definer Function.** It's the standard Supabase pattern for self-referencing RLS, requires no auth changes, and is the simplest fix. The function is marked `stable` (cacheable within a transaction) for performance.

## Consequences

- All admin RLS policies now use `public.is_admin()` instead of inline subqueries.
- New tables with admin policies should follow this pattern.
- The `is_admin()` function must be audited if the role system changes (e.g., adding super-admin).
- Migration 00004 retroactively fixes policies on `users`, `industries`, and `specializations`.

## References

- [Supabase RLS guide on security definer](https://supabase.com/docs/guides/database/postgres/row-level-security)
- Migration: `supabase/migrations/00004_fix_admin_rls_recursion.sql`
