# ADR 017: Messaging After Account Deletion

## Status
Accepted

## Context
When a user deletes their account, what should happen to their conversations from the other party's perspective? Two approaches:

1. **Remove conversations entirely** — Other party loses access to the conversation and all message history
2. **Show "This person is unavailable"** (Messenger/WhatsApp pattern) — Preserve conversation history, disable new messages

## Decision
**Option 2: Preserve conversations with "unavailable" state.**

The other party can still view all message history but cannot send new messages. The deleted user appears as "Deleted User" with a generic avatar.

## Rationale

- **Industry standard**: Facebook Messenger, WhatsApp, LinkedIn all preserve conversations when a user deletes their account
- **User expectation**: People expect to keep their conversation history — it may contain important information (contact details, agreements, referrals shared in chat)
- **Low complexity**: Only requires UI changes + an explicit `is_active` check, no schema changes
- **Reversible**: If the user reactivates during the 30-day grace period, the conversation resumes normally (though their display name may have shown as "Deleted User" temporarily)

## Implementation

### Detection
The conversation page queries `users.is_active` directly for the other participant. This is done explicitly (not via RLS) because admin users bypass the `users_select_active` RLS policy and would always see the profile data.

### UI Changes
- **Chat header**: Grey "?" avatar + "Deleted User" text, no profile link
- **Message input**: Replaced with a static banner: "This person is no longer available. You can view the conversation history but cannot send new messages."
- **Conversation sidebar**: Shows "Deleted User" as the other participant name
- **Message history**: Preserved as-is. Messages from the deleted user show "Deleted User" as sender name.

### Server-side Guard
`sendMessage()` action checks `users.is_active` for the other participant before the connection check. Returns "This person is no longer available." if the user is inactive.

## Consequences

- Conversations with deleted users remain in the sidebar indefinitely (no auto-cleanup)
- Hard delete (after 30 days) removes the deleted user's message rows entirely, so eventually the conversation will only show the remaining user's messages
- Phase 2 consideration: keep anonymized copies of deleted user's messages rather than deleting them during hard delete
