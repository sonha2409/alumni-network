# ADR 016: Account Deletion — Hard Delete Strategy

## Status
Accepted (Phase 1: pg_cron SQL, Phase 2: Edge Function)

## Context
Users need the ability to delete their accounts with a 30-day grace period. After the grace period, all personal data must be permanently removed. This requires a reliable scheduled job to perform the hard delete.

Three approaches were considered:

1. **pg_cron + raw SQL** — Database-native cron calls a PL/pgSQL function
2. **pg_cron + Edge Function** — Cron triggers an Edge Function that handles both DB cleanup and storage deletion
3. **On-login lazy delete** — Hard-delete triggered by any request from/about the expired user

## Decision
**Phased approach:**
- **Phase 1 (now)**: pg_cron calls `hard_delete_expired_accounts()` PL/pgSQL function directly. This handles all database rows but cannot clean up storage buckets.
- **Phase 2 (future)**: Replace with a Supabase Edge Function triggered by pg_cron. The Edge Function calls the same DB function plus cleans storage buckets and sends the 7-day reminder email.

## Rationale

### Why pg_cron (not Vercel Cron or lazy delete)
- **Reliability**: pg_cron runs inside the database — no external dependencies, no network failures
- **Atomicity**: The hard-delete function runs as a single transaction
- **No app deployment dependency**: Works even if the Next.js app is down

### Why phased (not Edge Function immediately)
- Edge Functions require separate deployment and testing infrastructure
- The core deletion logic (database rows) works perfectly in SQL
- Storage cleanup is not urgent — orphaned files are not exposed (no public URLs) and don't affect functionality
- Shipping Phase 1 delivers 95% of the value immediately

### Why not lazy delete
- Data lingers indefinitely if no one triggers the check
- No guaranteed timing for data removal — bad for compliance
- Adds latency to unrelated requests

## Consequences

### Phase 1 (current)
- Hard delete runs daily at 3 AM UTC
- All database rows are permanently deleted
- Orphaned storage files remain (avatars, attachments, verification docs)
- No 7-day reminder email before hard delete

### Phase 2 (future)
- Edge Function handles storage cleanup via Supabase Storage API
- 7-day reminder email sent via Resend
- `account_deletion_log.data_export_generated` field populated accurately
- Admin dashboard section for pending deletions

### Fallback
If pg_cron is unavailable (e.g., Supabase free tier without the extension), the `hard_delete_expired_accounts()` function can be called:
- Manually from Supabase SQL Editor
- Via a Vercel Cron API route (`/api/cron/hard-delete`)
- From a Supabase Edge Function on its own schedule
