# Feature: Notification Grouping

**Date Implemented**: 2026-03-14
**Status**: Complete
**Related ADRs**: ADR-023

## Overview

Groups repeated `new_message` notifications per conversation into a single notification row. Instead of "New message from X" appearing N times, users see "X sent you N messages". Also debounces email notifications — only the first message in a group triggers an email.

## Architecture

### Data Flow

```mermaid
sequenceDiagram
    actor Sender
    participant SendMsg as sendMessage()
    participant NotifyGrp as notifyUserGrouped()
    participant DB as upsert_message_notification()
    participant RT as Supabase Realtime
    participant UI as NotificationsProvider

    Sender->>SendMsg: Send message
    SendMsg->>NotifyGrp: notifyUserGrouped(recipientId, ...)
    NotifyGrp->>DB: RPC upsert_message_notification

    alt No existing unread notification
        DB->>DB: INSERT new row (count=1)
        DB-->>NotifyGrp: {is_new: true}
        NotifyGrp->>NotifyGrp: Send email
        RT-->>UI: INSERT event
        UI->>UI: Add to list, increment unread
    else Existing unread notification found
        DB->>DB: UPDATE row (count++, new title/body)
        DB-->>NotifyGrp: {is_new: false}
        Note over NotifyGrp: No email sent
        RT-->>UI: UPDATE event
        UI->>UI: Replace in list, move to top
    end
```

### Grouping Logic

```mermaid
flowchart TD
    A[New message sent] --> B{Existing unread notification<br/>for same conversation?}
    B -->|No| C[INSERT new notification<br/>count=1, title='New message from X']
    B -->|Yes| D[UPDATE existing<br/>count++, title='X sent you N messages']
    C --> E{is_new?}
    D --> E
    E -->|true| F[Send email notification]
    E -->|false| G[Skip email]
    C --> H[Realtime INSERT event]
    D --> I[Realtime UPDATE event]
    H --> J[UI: add + increment badge]
    I --> K[UI: replace + move to top]
```

### Reset Cycle

```mermaid
stateDiagram-v2
    [*] --> NoNotification
    NoNotification --> SingleMessage: First message
    SingleMessage --> GroupedMessages: More messages
    GroupedMessages --> GroupedMessages: Even more messages
    SingleMessage --> Read: User reads
    GroupedMessages --> Read: User reads
    Read --> NoNotification: is_read=true
    NoNotification --> SingleMessage: Next message creates fresh group
```

## Key Files

| File | Purpose |
|------|---------|
| `supabase/migrations/00037_notification_grouping.sql` | Adds `grouped_count` column, `upsert_message_notification()` function |
| `src/lib/notifications.ts` | `notifyUserGrouped()` — calls upsert RPC, controls email send |
| `src/app/(main)/messages/actions.ts` | `sendMessage()` — calls `notifyUserGrouped` instead of `notifyUser` |
| `src/app/(main)/notifications/components/notifications-provider.tsx` | Realtime: handles UPDATE events for grouped refresh |
| `src/app/(main)/notifications/components/notification-item.tsx` | Shows `updated_at` timestamp for freshness |
| `src/lib/types.ts` | `Notification` interface — added `grouped_count` field |

## Edge Cases and Error Handling

- **User reads notification**: `is_read` becomes true. Next message creates a fresh notification (new group), triggering a new email.
- **Multiple senders**: Grouping is keyed by `link` (conversation URL), so different senders to different conversations get separate notifications.
- **Race condition**: The upsert runs inside a single SECURITY DEFINER function, making it atomic.
- **Backward compatibility**: `grouped_count` defaults to 1 for all existing rows.

## Design Decisions

- Title constructed in SQL (`p_actor_name || ' sent you ' || count || ' messages'`) to keep it atomic and avoid a read-then-write race.
- Email debounce via `is_new` return value rather than a separate timestamp column — simpler, zero extra storage.
- Only `new_message` type uses grouping currently. Other types (connection requests, announcements) remain ungrouped since they're infrequent.

## Future Considerations

- Extend grouping to other notification types if they become noisy.
- ADR-023 Option B (pg_cron digests) for daily/weekly email summaries.
- Show grouped message count as a badge in the notification item UI.
