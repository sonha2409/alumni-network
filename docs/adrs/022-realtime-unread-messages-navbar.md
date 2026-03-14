# ADR-022: Real-Time Unread Message Badge in Navbar

**Date**: 2026-03-13
**Status**: Accepted
**Feature**: Real-Time Messaging (F8), Message Attachments (F40)

## Context

The navbar message badge was static — rendered once on page load by the `MainNavbar` server component via `getTotalUnreadCount()`. When a new message arrived, the badge only updated on full page reload. The notification bell, by contrast, updated instantly via `NotificationsProvider` (a React context with Supabase Realtime subscription).

Additionally, document attachments could not be opened on mobile (iOS Safari) because the download handler used `window.open()` inside an async function. iOS Safari blocks `window.open()` calls that happen after an `await`, treating them as popups.

## Options Considered

### Option A: Standalone `UnreadMessagesWrapper` (separate server component)

- **Description**: Mirror the `NotificationsWrapper` exactly — a new async server component wrapping the navbar that calls `getUser()` and `getTotalUnreadCount()`.
- **Pros**: Clean separation of concerns. Follows the existing pattern exactly.
- **Cons**: Adds a second `getUser()` call in the layout (one in `NotificationsWrapper`, one in `UnreadMessagesWrapper`). When nested, these run sequentially, doubling latency and blocking the entire page.

### Option B: Merge into existing `NotificationsWrapper`

- **Description**: Extend `NotificationsWrapper` to also fetch unread message count in the same `Promise.all()` as notification data. Initialize both `NotificationsProvider` and `UnreadMessagesProvider` from the same server component.
- **Pros**: Single `getUser()` call. All initial data fetched in parallel. No additional blocking in the layout.
- **Cons**: `NotificationsWrapper` now knows about messages (slightly mixed concerns). Acceptable trade-off for performance.

### Option C: Client-side only (no server-side initial count)

- **Description**: Skip the server-side fetch entirely. Initialize with `0` and rely on Realtime subscription to build up the count.
- **Pros**: Zero additional server work at page load.
- **Cons**: Badge would be wrong until messages arrive via Realtime. Existing unread messages from before the page load would be invisible.

## Decision

**Option B** — Merge the unread message count fetch into the existing `NotificationsWrapper`. This avoids the double `getUser()` performance regression while providing accurate initial counts and real-time updates.

For the mobile attachment issue: replaced the async `window.open()` / programmatic `<a>.click()` approach with a native `<a>` tag using a pre-fetched signed URL. The URL is fetched on component mount via `useEffect`, making the tap handler fully synchronous — which iOS Safari allows.

## Consequences

- `NotificationsWrapper` now initializes both `NotificationsProvider` and `UnreadMessagesProvider`.
- `MainNavbar` server component no longer fetches `getTotalUnreadCount()` — the count comes from context.
- `MainNavbarClient` uses `useUnreadMessages()` hook instead of static `user.unreadMessageCount` prop.
- `NavbarUserData` no longer has `unreadMessageCount` field.
- `getTotalUnreadCount()` query optimized from sequential N+1 (one query per conversation in a `for` loop) to parallel `Promise.all()`.
- `DocumentRow` now renders as a native `<a>` tag with pre-fetched signed URL instead of a `<button>` with async click handler.
- Deleted unused `unread-badge.tsx` component (was never integrated).

## References

- ADR-009: Notifications SECURITY DEFINER insert (same provider pattern)
- `src/app/(main)/notifications-wrapper.tsx` — combined wrapper
- `src/app/(main)/messages/components/unread-messages-provider.tsx` — new provider
- `src/app/(main)/messages/components/attachment-preview.tsx` — mobile fix
