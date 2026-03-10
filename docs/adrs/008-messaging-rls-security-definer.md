# ADR-008: SECURITY DEFINER Helpers for Messaging RLS Policies

**Date**: 2026-03-10
**Status**: Accepted
**Feature**: F8 Real-Time Messaging

## Context

Messaging tables (conversations, messages, message_reports) need RLS policies that check the current user's verification status. These checks subquery `public.users`, but `public.users` itself has RLS enabled. This causes the same RLS recursion problem solved in ADR-002 for admin policies.

Additionally, `INSERT ... RETURNING` (used by Supabase's `.insert().select()`) requires both INSERT and SELECT permissions. The SELECT policy on conversations requires being a participant — but participant rows don't exist yet at INSERT time.

## Options Considered

### Option A: SECURITY DEFINER Helper Functions

- **Description**: Create `is_verified_user()` and `is_moderator_or_admin()` functions with `SECURITY DEFINER` that bypass RLS on `public.users`. For the INSERT+RETURNING issue, generate UUIDs server-side and skip `.select()`.
- **Pros**: Consistent with ADR-002 pattern. Clean, reusable functions. No schema changes needed.
- **Cons**: More functions in the database.

### Option B: Disable RLS on users table for function calls

- **Description**: Use `SET search_path` tricks or bypass RLS differently.
- **Pros**: Fewer helper functions.
- **Cons**: Breaks the established pattern. Less maintainable. Security risk if not done carefully.

### Option C: Service Role Key for conversation creation

- **Description**: Use the service role key (bypasses RLS) for creating conversations.
- **Pros**: Simple.
- **Cons**: Service role key on the server side is risky to use broadly. Bypasses all RLS, not just the specific check needed. Violates principle of least privilege.

## Decision

**Option A: SECURITY DEFINER helpers + server-side UUID generation.** Follows the established ADR-002 pattern. The `is_verified_user()` function is reusable across any future table that needs to check verification status in RLS.

For the INSERT+RETURNING issue: `randomUUID()` generates the conversation ID in the server action, passes it in the INSERT, and skips `.select()` entirely.

## Consequences

- `is_verified_user()` and `is_moderator_or_admin()` are reusable for future RLS policies (notifications, groups, etc.)
- Server actions must use `randomUUID()` for conversation creation instead of relying on DB-generated IDs
- Migration 00015 fixes the policies created in 00014 — both must be applied together

## References

- ADR-002: Admin RLS Security Definer (same pattern)
- `supabase/migrations/00015_fix_messaging_rls_policies.sql`
- `supabase/migrations/00004_fix_admin_rls_recursion.sql` (original pattern)
