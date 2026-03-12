# ADR-019: Pre-Deployment Security Hardening

**Date**: 2026-03-11
**Status**: Accepted
**Feature**: Pre-deploy audit (Feature #35c)

## Context

A full architecture, design, and implementation review was conducted before soft launch (<100 users). The audit covered all 29 tables with RLS, 24 server actions, the proxy layer, real-time messaging, and auth flows. The codebase is generally solid — RLS everywhere, consistent `ActionResult<T>` error handling, defense-in-depth (proxy + server action + RLS). However, 8 issues were identified that need fixing before deployment, ranging from critical security vulnerabilities to reliability concerns.

### Issues Found (by severity)

| # | Issue | Severity | Category |
|---|-------|----------|----------|
| 1 | Users can set own `role`/`verification_status` via direct API | CRITICAL | Auth/Permissions |
| 2 | `sendMessage()` doesn't check blocks — bypass via existing conversations | CRITICAL | Auth/Permissions |
| 3 | 6 analytics RPC functions callable by any authenticated user | CRITICAL | Auth/Permissions |
| 4 | Proxy fails open when Supabase status query errors | HIGH | Auth/Permissions |
| 5 | Race condition creates duplicate conversations (no DB uniqueness) | HIGH | Messaging/Reliability |
| 6 | Real-time subscription misses messages during setup gap | HIGH | Messaging/Reliability |
| 7 | Any verified user can INSERT into `conversation_participants` for any conversation | HIGH | Auth/Permissions |
| 8 | Signup reveals whether email is already registered | HIGH | Auth/Permissions |

### Deferred Items (Post-Launch)

These were identified but accepted for soft launch risk:
- Rate limit bypass via race condition (needs Redis — Phase 2)
- Message soft-delete not enforced at RLS level (app-layer only)
- Missing security headers (CSP, X-Frame-Options, etc.)
- Missing indexes (notifications, message_reports, dismissed_announcements)
- Unread count N+1 queries (O(n) per conversation list load)
- Storage cleanup job for soft-deleted attachments
- 10 failing unit tests (profile-completeness + onboarding)
- Mute status not enforced at RLS level (server action only)

## Options Considered

### Option A: Fix All 17 Issues

- **Pros**: Maximum security posture.
- **Cons**: Significant time investment. Some issues (Redis rate limiting, storage cleanup) require infrastructure changes. Diminishing returns for <100 users.

### Option B: Fix Critical + High Issues (8 fixes)

- **Pros**: Addresses all exploitable vulnerabilities. Acceptable risk for remaining items at soft-launch scale. Targeted changes, no refactoring.
- **Cons**: 9 items deferred, creating tech debt.

### Option C: Critical Only (3 fixes)

- **Pros**: Fastest path to deploy.
- **Cons**: Leaves exploitable high-severity issues (duplicate conversations, participant injection, email enumeration).

## Decision

**Option B** — Fix all 8 critical + high issues. The deferred items are acceptable at <100 user scale and documented for Phase 2.

### Fix Details

#### Fix 1: Role Escalation Prevention
**Change:** Replace `users_update_own` RLS policy to add `WITH CHECK` ensuring `role` and `verification_status` match their current values. Users can still update allowed columns (e.g., `muted_until` is set by SECURITY DEFINER functions, not direct update).

**Design rationale:** RLS `WITH CHECK` is the simplest, most reliable approach. A trigger would also work but adds complexity. The subquery `(SELECT role FROM users WHERE id = auth.uid())` reads the pre-update value, preventing modification.

#### Fix 2: Block Check in sendMessage
**Change:** Add block lookup query in `sendMessage()` after fetching `otherParticipant`, before connection check. Returns generic error to prevent information leakage about who blocked whom.

**Design rationale:** Defense-in-depth. The block check in `getOrCreateConversation()` prevents new conversations but doesn't cover existing ones. RLS alone can't enforce this cleanly because the messages table doesn't join to blocks.

#### Fix 3: Admin Checks on Analytics Functions
**Change:** `CREATE OR REPLACE` all 6 analytics functions to add `IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'` at the top.

**Design rationale:** Consistent with how newer functions (map RPCs) already work. The `is_admin()` SECURITY DEFINER function avoids RLS recursion.

#### Fix 4: Proxy Fail-Closed
**Change:** Check for `statusError` after the users status query. On error, log and redirect to `/login`. Same for profile count query.

**Design rationale:** Fail-closed is standard security practice. During a Supabase outage, users will be signed out rather than potentially bypassing bans/suspensions. The trade-off (false-positive lockouts during outages) is acceptable.

#### Fix 5: Duplicate Conversation Prevention
**Change:** Add `user_pair text` column to `conversations` table with unique index. Computed as `LEAST(userA, userB) || ':' || GREATEST(userA, userB)`. Backfill existing rows. Update `getOrCreateConversation()` to set on insert and handle constraint violations.

**Design rationale:** Chosen over advisory locks (application-level, not foolproof) and separate junction table (over-engineering). A computed column with unique index is simple, fast, and enforced at DB level. Integrates cleanly with Fix 7's SECURITY DEFINER function.

#### Fix 6: Real-Time Subscription Gap Fill
**Change:** After `channel.subscribe()` reaches `SUBSCRIBED` status, fetch messages newer than the last loaded message. Merge into state with ID-based dedup.

**Design rationale:** This is a known pattern for Supabase Realtime. The alternative (server-sent events or polling) adds complexity. The gap window is typically <100ms, so missed messages are rare but possible under load.

#### Fix 7: Atomic Conversation Creation
**Change:** Create `create_conversation_with_participant(p_other_user_id)` SECURITY DEFINER function that handles the entire flow atomically: auth check, verification, block check, connection check, dedup via `user_pair`, conversation + participant creation. Drop the direct INSERT policy on `conversation_participants`. Refactor `getOrCreateConversation()` to call this RPC.

**Design rationale:** The current pattern (app inserts both participants) can't be secured via RLS alone — a `user_id = auth.uid()` check would prevent adding the other user. Moving to a SECURITY DEFINER function centralizes all validation in one place and eliminates the race condition from Fix 5. Trade-off: slightly harder to debug (function runs as definer, not invoker).

#### Fix 8: Email Enumeration Prevention
**Change:** On "already registered" Supabase error, return `{ success: true }` (same as successful signup). User sees generic "Check your email" message.

**Design rationale:** OWASP recommendation. The trade-off is slightly worse UX for users who forgot they already have an account — they'll need to use "Forgot password" instead of getting a direct hint. This is standard practice.

## Consequences

- **Migration 00031** will contain all DB changes (RLS, functions, column, index, backfill)
- `getOrCreateConversation()` refactored to use RPC — simpler app code, more logic in DB
- Proxy becomes stricter — users may be signed out during Supabase outages
- Signup UX slightly less helpful for duplicate emails (intentional security trade-off)
- 9 items deferred as documented tech debt for Phase 2

## References

- OWASP Authentication Cheat Sheet (email enumeration)
- Supabase RLS documentation (WITH CHECK semantics)
- Supabase Realtime subscription lifecycle
- SPEC.md Feature Log #35c
