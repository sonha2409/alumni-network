# ADR-007: Two-Table Messaging Schema (Conversations + Messages)

**Date**: 2026-03-10
**Status**: Accepted
**Feature**: F8 Real-Time Messaging

## Context

Need to store 1-on-1 messages between connected alumni. The schema must support:
- Fast conversation list queries (sorted by last message)
- Unread count per conversation
- Cursor-based message pagination within a conversation
- Future extensibility to group chat (Phase 4)
- Scale to thousands of users

## Options Considered

### Option A: Two-Table (conversations + messages)

- **Description**: Separate `conversations` table with metadata (last_message_at, preview), `conversation_participants` junction table, and `messages` table. Conversation list queries hit the lightweight `conversations` table, not the potentially massive `messages` table.
- **Pros**: O(1) conversation list (no scanning messages), unread tracking via `last_read_at` cursor on participants, clean extensibility to group chat, industry standard (Slack, Discord, WhatsApp, Telegram).
- **Cons**: Slightly more complex schema (3 tables vs 1). Requires keeping `conversations.last_message_at` in sync.

### Option B: Single Messages Table

- **Description**: Single `messages` table. Conversations are derived from unique sender/receiver pairs via aggregation queries.
- **Pros**: Simpler schema.
- **Cons**: Conversation list requires expensive GROUP BY with MAX(created_at) across all messages. Unread counts require scanning all messages per conversation. Doesn't scale. Hard to extend to group chat.

## Decision

**Option A: Two-table schema.** The performance and extensibility advantages far outweigh the small increase in schema complexity. This is the industry standard approach used by every major messaging platform.

Sync strategy: `sendMessage` server action updates `conversations.last_message_at` and `last_message_preview` on every message send. This adds one extra UPDATE per message but keeps conversation list queries instant.

## Consequences

- Conversation list page loads are O(conversations) not O(messages) — scales well.
- Unread count is a simple `COUNT(*) WHERE created_at > last_read_at` per conversation.
- Adding group chat later requires only adding a `type` column to conversations and removing the 2-participant assumption — no schema redesign.
- `last_message_preview` is denormalized — must stay in sync. Handled in the `sendMessage` server action.

## References

- `FEATURES.md` — F8 Real-Time Messaging
- `supabase/migrations/00014_create_messaging_tables.sql`
- `docs/features/real-time-messaging.md`
