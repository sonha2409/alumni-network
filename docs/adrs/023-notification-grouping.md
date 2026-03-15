# ADR-023: Notification Grouping for Messages

**Date**: 2026-03-14
**Status**: Accepted
**Feature**: In-app & email notifications

## Context

Every chat message creates a separate in-app notification and email. When users exchange messages rapidly, the recipient sees a flood of identical "New message from X" notifications and receives excessive emails (problematic with Resend's 100/day free tier). Notifications should be grouped per sender/conversation.

## Options Considered

### Option A: Server-side upsert + email debounce

- **Description**: When a `new_message` notification arrives, check for an existing unread notification for the same conversation. If found, update it with an incremented count ("X sent you N messages"). Only send email on first notification creation; skip email on subsequent grouping updates.
- **Pros**: Simple, no new tables, minimal migration, naturally debounces email, atomic via SECURITY DEFINER function.
- **Cons**: Loses individual message previews in notifications (only latest preview shown).

### Option B: Background batch via pg_cron

- **Description**: Queue notifications and process them periodically (e.g., every 5 minutes) to batch multiple messages into a single notification.
- **Pros**: More sophisticated batching, could support digest emails.
- **Cons**: Requires pg_cron setup, adds infrastructure complexity, introduces delay for first notification, overkill for Phase 1.

### Option C: Client-side grouping only

- **Description**: Keep creating individual DB rows but group them in the frontend UI.
- **Pros**: No backend changes.
- **Cons**: Still floods the database, still sends excessive emails, doesn't solve quota problem. DB bloat over time.

## Decision

Option A — server-side upsert with implicit email debounce.

The `upsert_message_notification` SECURITY DEFINER function atomically checks for an existing unread notification with the same `(user_id, type, link)` tuple. If found, it increments `grouped_count` and updates the title/body. If not, it creates a new row. The function returns `is_new` to signal whether email should be sent.

## Consequences

- One notification row per unread conversation instead of one per message.
- Email sent only on first message after user reads previous notification (natural debounce).
- `grouped_count` column added to `notifications` table (default 1, backward compatible).
- Real-time provider updated to handle UPDATE events (for grouped notification refreshes).
- Timestamp in notification UI shows `updated_at` instead of `created_at` for freshness.
- Future: Option B (pg_cron digests) could be layered on top for daily/weekly email summaries.

## References

- ADR-009: SECURITY DEFINER for notification inserts
- ADR-011: Email notifications via Resend (direct send)
- Migration: `00037_notification_grouping.sql`
