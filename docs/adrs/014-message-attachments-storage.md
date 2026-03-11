# ADR-014: Message Attachments Storage Strategy

**Date**: 2026-03-10
**Status**: Accepted
**Feature**: Message Attachments (Media & File Sharing)

## Context

Users requested the ability to share images and documents within conversations. We needed to decide on a storage strategy, file handling approach, and quota system that works within Supabase free tier limits (1GB storage).

Key constraints:
- Supabase free tier: 1GB total storage
- Must not degrade messaging performance
- Files need access control (only conversation participants can view)
- Need a path to scale beyond free tier

## Options Considered

### Option A: JSON column on messages table

- **Description**: Store attachment metadata as a JSONB array on the `messages` table.
- **Pros**: Simple, no schema changes, single query returns messages + attachments.
- **Cons**: No indexing on attachment fields, no foreign key integrity, harder to query attachments across messages (e.g., for a media panel), difficult to enforce constraints.

### Option B: Separate `message_attachments` table

- **Description**: Normalized table with FK to `messages`, dedicated indexes, and RLS policies.
- **Pros**: Proper relational design, queryable (media panel, storage quota), indexable, soft-delete with deferred storage cleanup, can enforce constraints at DB level.
- **Cons**: Extra join/query when fetching messages, slightly more complex insert flow.

### Option C: External storage (R2/S3) with metadata table

- **Description**: Store files in Cloudflare R2 or AWS S3, metadata in Supabase.
- **Pros**: Unlimited storage, CDN support, cheaper at scale.
- **Cons**: Over-engineered for Phase 1, requires additional infrastructure, complex auth flow for signed URLs.

## Decision

**Option B**: Separate `message_attachments` table with Supabase Storage.

Rationale:
- Proper relational model enables the media panel feature (query attachments by conversation, filter by type, paginate)
- Soft-delete pattern aligns with existing codebase conventions
- Per-user storage quota (25MB) is queryable via `SUM(file_size) WHERE uploader_id = uid`
- Supabase Storage bucket provides built-in MIME type validation and file size limits
- Migration path to R2/S3 is straightforward (change storage layer, keep metadata table)

Additional decisions:
- **Per-file limit**: 5MB (enforced at bucket level and server action)
- **Per-user quota**: 25MB (enforced in server action before insert)
- **Max files per message**: 5
- **File type whitelist**: JPEG, PNG, WebP, GIF + PDF, DOCX, XLSX, PPTX, TXT, CSV
- **No server-side thumbnails**: CSS-only image resizing in Phase 1
- **Signed URLs**: 1-hour expiry with `onError` re-fetch for expired URLs
- **Cleanup**: Soft-deleted files have 30-day grace period before storage purge

## Consequences

- Messages query now includes a batch fetch for attachments (N+1 avoided via `WHERE message_id IN (...)`)
- Storage bucket `message-attachments` uses folder structure `{user_id}/{conversation_id}/{uuid}.{ext}` for RLS path-based policies
- 25MB/user quota means ~125 users can use full quota before hitting 1GB free tier (with overhead). Document upgrade to Supabase Pro (100GB) or external storage when approaching limit.
- Cleanup job for purging soft-deleted files from storage is documented but not yet automated (requires `pg_cron` on Pro plan or external cron)

## References

- Supabase Storage docs: bucket policies, signed URLs
- SPEC.md: Feature #40 (Message Attachments)
- Related: ADR-003 (verification document upload — same pattern)
