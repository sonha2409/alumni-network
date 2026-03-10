# ADR-009: SECURITY DEFINER for Notification Inserts

**Date**: 2026-03-10
**Status**: Accepted
**Feature**: In-App Notifications (F21)

## Context

Notifications must be created server-side when events occur (connection requests, messages, verification updates). Users should never be able to create arbitrary notifications — fake "You have a new connection request" notifications would be a social engineering vector.

We need a mechanism to insert rows into the `notifications` table that bypasses RLS (since there's no INSERT policy for regular users) while still being callable from server actions.

## Options Considered

### Option A: Service Role Key

- **Description**: Use a separate Supabase client initialized with `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS entirely.
- **Pros**: Simple, no DB-level changes needed.
- **Cons**: Requires a service-role client in every server action that creates notifications. Risk of accidentally using the service-role client for other operations that should respect RLS.

### Option B: INSERT RLS Policy with Constraints

- **Description**: Add an INSERT policy that allows authenticated users to insert notifications, but only for other users (not themselves).
- **Pros**: No special functions needed.
- **Cons**: A malicious client could still craft INSERT requests to send fake notifications to any user. The RLS policy can only check `auth.uid() != user_id`, but can't verify the notification corresponds to a real event.

### Option C: SECURITY DEFINER Function

- **Description**: Create a `create_notification()` Postgres function with `SECURITY DEFINER` that inserts into the notifications table. The function runs with the permissions of the function creator (superuser), bypassing RLS. Called via `supabase.rpc()`.
- **Pros**: No INSERT policy needed — the function is the only way to insert. Centralizes notification creation logic in the DB. Consistent with the pattern already used for messaging (ADR-008).
- **Cons**: Slightly more complex than a direct insert.

## Decision

**Option C: SECURITY DEFINER function.** This follows the established pattern from messaging (ADR-008) and provides the strongest security guarantee — there is literally no way for a client to insert a notification row except through the controlled function. The function signature also serves as a clear API contract.

## Consequences

- Notifications can only be created via `supabase.rpc('create_notification', {...})`.
- The `notifyUser()` TypeScript helper wraps this RPC call for convenience.
- No INSERT RLS policy exists on the `notifications` table — this is intentional, not an oversight.
- Future notification types (e.g., `group_invite`, `report_action`) just need to be added to the `notification_type` enum; the function handles any type.

## References

- ADR-008: Messaging RLS SECURITY DEFINER (same pattern)
- ADR-002: Admin RLS SECURITY DEFINER (original pattern introduction)
- Migration: `supabase/migrations/00016_create_notifications_table.sql`
