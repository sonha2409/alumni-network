# ADR-015: Announcements — Banner + Notifications Display Strategy

**Date**: 2026-03-11
**Status**: Accepted
**Feature**: Admin Announcements (#30)

## Context

Admins need to broadcast platform-wide notices. The key decision is how to surface announcements to users — via the existing notification system, a dedicated banner, or both.

## Options Considered

### Option A: Banner + Notification Feed

- **Description**: Show a dismissible banner at the top of every main app page AND send a notification to each verified user's feed/email.
- **Pros**: Maximum visibility. Banner catches attention on every page load. Notifications provide a persistent record and email reach.
- **Cons**: Slightly more implementation work. Two display mechanisms to maintain.

### Option B: Notification Feed Only

- **Description**: Send announcements as notifications only (bell icon + email). No banner.
- **Pros**: Simpler implementation. Reuses existing notification infrastructure entirely.
- **Cons**: Notifications are easily missed — users may not check the bell. No persistent visibility on the page.

## Decision

**Option A: Banner + Notifications.** Banners ensure active announcements are seen on every page load until explicitly dismissed. The notification serves as a backup channel (in-app + email) for users who don't visit frequently.

The banner is a Server Component that fetches on each server render (no real-time subscription needed). It queries for the most recent active, non-dismissed announcement. Dismissals are persisted in a `dismissed_announcements` junction table.

## Consequences

- Users see announcements in two places: banner (persistent until dismissed) and notification feed (historical record)
- Deactivating an announcement hides the banner but does NOT remove already-sent notifications (by design — notifications are a historical record)
- No real-time push for the banner — users see it on their next navigation. The notification bell provides real-time awareness via Supabase Realtime.
- `dismissed_announcements` table adds a small per-user storage cost but enables per-user dismissal tracking

## References

- Feature #30 in SPEC.md
- `docs/features/announcements.md` for full implementation notes
- ADR-009 (notifications SECURITY DEFINER pattern) — reused for announcement broadcast
