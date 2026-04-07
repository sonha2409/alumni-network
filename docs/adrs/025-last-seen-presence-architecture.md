# ADR-025: Last-Seen Online — Throttled RPC + Per-User Presence Channels

**Date**: 2026-04-07
**Status**: Accepted
**Feature**: F45 — Last seen online (privacy-gated)

## Context

We want to show "Active now" / "Active 5 minutes ago" on profile pages and chat headers as a soft trust signal: it tells an alumnus whether the person they're considering reaching out to is still active on the platform. This is privacy-sensitive — leaking activity timestamps to strangers is the wrong default — so visibility must be gated, and the write path must not become a hot spot in the database.

The feature has two halves:
1. **Persistent "last seen"** — a server-side timestamp the viewer sees when the target is offline.
2. **Live "online now"** — a transient signal that the target is currently using the app, so the offline timestamp can be replaced by a green dot.

Constraints:
- Single-school deployment, soft launch — we cannot afford a write-amplification design that scales `O(requests × users)`.
- All Supabase access is RLS-gated; the visibility rule needs to be enforceable in SQL, not just in app code.
- Realtime infra (Supabase Realtime) is already wired in for messages; we want to reuse it, not introduce a new transport.

## Options Considered

### Option A: Heartbeat from the client every N seconds

- **Description**: A `setInterval` in the browser POSTs to a server action which UPSERTs `last_active_at`.
- **Pros**: Simple. Decoupled from request flow.
- **Cons**: Write amplification scales with open tabs, not user activity. Requires its own auth/throttle layer. Adds a permanent background timer to every authenticated session.

### Option B: Touch on every authenticated request, no throttle

- **Description**: Update `last_active_at` from `proxy.ts` on every request.
- **Pros**: No client code, no extra round-trips.
- **Cons**: Catastrophic write volume. A single page load can trigger dozens of proxy hits (HTML, server actions, RSC payloads). Postgres WAL bloat.

### Option C: Throttled RPC from the proxy, gated by a SQL `WHERE` clause

- **Description**: `proxy.ts` calls a `touch_last_seen()` RPC fire-and-forget on every authenticated request. The RPC self-guards: `UPDATE … WHERE last_active_at < now() - interval '1 minute'`. Idempotent and effectively free for fresh users.
- **Pros**: Bounded write volume (~1 UPDATE / user / minute regardless of request count). No client-side state. No background timers. The throttle is enforced in the database, not in app code, so it's correct under concurrent requests.
- **Cons**: Slight latency on the proxy if we ever `await` the RPC (we don't — it's `void`-prefixed fire-and-forget).

### Live "online now" — three sub-options

- **D1: Global presence channel** — every client joins one big `online-users` channel. Scales `O(users²)` in payload size. Rejected.
- **D2: Per-conversation presence channel** — only know presence of people you're chatting with. Already used for typing indicators. Doesn't extend to profile pages.
- **D3: Per-user presence channels (`user-presence:${userId}`)** — each user announces on their own channel; observers join target-specific channels only when viewing that target's profile or chat. Scales with `viewers × profiles_being_viewed`, not `users²`.

## Decision

**Option C** for the persistent timestamp + **Option D3** for the live indicator.

- `proxy.ts` calls `void supabase.rpc("touch_last_seen")` after the user-status select. The RPC is `SECURITY DEFINER`, pinned `search_path = public`, and self-throttles via `WHERE last_active_at < now() - interval '1 minute'`.
- A `<PresenceAnnouncer>` client component is mounted once per authenticated session in `notifications-wrapper.tsx`. It joins `user-presence:${currentUserId}` and tracks an `online_at` timestamp. Unmounts on navigation away from the main app group / sign-out.
- A `<LastSeenIndicator>` client component joins the *target's* presence channel as a read-only observer when rendered on a profile page or chat header. It flips between "Active now" + green dot (presence sync sees ≥1 entry) and a relative-time label (`Intl.RelativeTimeFormat`) computed from the snapshot timestamp.
- Visibility is enforced server-side by `can_see_last_seen(p_target)` and `get_last_seen(p_target)` — both `SECURITY DEFINER`. The gate requires: target's `show_last_active = true` AND viewer/target are accepted-connected AND both have sent ≥1 non-deleted message in a shared conversation. When the gate fails, `get_last_seen` returns `NULL`, indistinguishable from "never online" — matching WhatsApp.
- `last_active_at` itself remains freely readable on `profiles` so the directory's "recently active" sort continues to work for ordering. `get_last_seen()` is the only supported display readout.

## Consequences

- **Write volume is bounded**: ~1 UPDATE per user per minute of activity, regardless of how many requests they fire. The `WHERE` clause is the throttle, so it's correct even under burst traffic.
- **The gate is auditable in one place**: `can_see_last_seen()` is the single source of truth. Future surfaces (e.g. directory tooltips) call `get_last_seen()` and inherit the gate for free.
- **Presence is opt-in per profile view**: no global subscription, no "who's online" table. Cost scales with profile views, not user count squared.
- **Privacy toggle is a hard cutoff**: when a user disables `show_last_active`, *everyone* — even gated viewers — sees `null`. The collapse to `null` means viewers can't infer that the toggle was flipped (it looks identical to "never online").
- **No way to distinguish "hidden" from "never online"** — intentional. Aligns with WhatsApp/Signal/iMessage. If we ever add an explicit "hidden" state for moderators or admins, it'll be a new RPC, not a leak in this one.
- **The chat header uses client-fetch mode** — `<LastSeenIndicator>` calls `get_last_seen` from the browser when no server-prefetched value is provided. The RPC's SECURITY DEFINER + `auth.uid()` gate means this is safe.

## References

- Plan: `~/.claude/plans/structured-wandering-ripple.md`
- Migration: `supabase/migrations/00038_last_seen_online.sql`
- Implementation notes: `docs/features/last-seen-online.md`
- Related: ADR-022 (Realtime unread messages navbar), ADR-008 (messaging RLS SECURITY DEFINER pattern)
