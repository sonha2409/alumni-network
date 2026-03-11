# ADR-013: Bulk Invite — Immediate Send vs Queued Processing

**Date**: 2026-03-10
**Status**: Accepted
**Feature**: Admin Bulk Invite (F29)

## Context

Admins need to send invite emails to up to 500 alumni at once via CSV upload. The system needs to parse the CSV, validate rows, insert records, and send emails. The question is whether to send emails immediately in the request or queue them for background processing.

## Options Considered

### Option A: Immediate Send (Fire-and-Forget)

- **Description**: Parse CSV, insert rows, and call `sendEmail()` in a loop within the same server action. Each email call is fire-and-forget (no `await` on send, errors logged but not thrown).
- **Pros**: Simple implementation. Matches existing `sendEmail()` pattern used by notifications. No additional infrastructure needed.
- **Cons**: Request may be slow for large batches (500 emails). If the request times out, some emails may not be sent (but DB records are already inserted, allowing resend).

### Option B: Queued Processing

- **Description**: Insert rows with a `pending` status, then use a Supabase Edge Function or cron job to process the queue and send emails in the background.
- **Pros**: More resilient for very large batches. Request returns immediately. Better retry handling.
- **Cons**: Significantly more complex. Requires Edge Function setup, queue management, and status polling. Over-engineered for Phase 1 scale.

## Decision

**Option A: Immediate Send**. The fire-and-forget pattern is already proven in the codebase for notification emails. The 500-row limit keeps batch sizes manageable. The resend button provides a manual recovery mechanism for any emails that fail. Background processing can be added in Phase 2 if needed.

## Consequences

- Email sending is best-effort within the request lifecycle.
- Large batches (400-500) may result in slower response times but the UI shows a loading state.
- The "Resend" button on individual invites provides manual recovery.
- If scale grows beyond 500 per upload, this decision should be revisited.

## References

- SPEC.md Feature Log #29
- `src/lib/email.ts` — existing fire-and-forget pattern
- ADR-011 — Email notification Resend integration
