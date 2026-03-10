# ADR-012: Groups Schema with Future-Ready Columns

**Date**: 2026-03-10
**Status**: Accepted
**Feature**: Groups (basic, admin-created)

## Context

The Groups feature (F10) requires a schema for admin-created alumni groups. Phase 1 scope is simple: admin creates groups, verified users browse and join, group detail shows a member directory. However, the roadmap includes user-created groups, group roles, group chat, events, and cover images in later phases.

The key decision: should the schema only include what's needed for Phase 1, or include columns for future features?

## Options Considered

### Option A: Minimal Schema (Phase 1 only)

- **Description**: `groups` has only name, slug, description, type, created_by, is_active. `group_members` has only group_id and user_id.
- **Pros**: Simplest possible migration. No unused columns.
- **Cons**: Requires ALTER TABLE migrations for every Phase 2 feature. Each migration is a potential downtime risk. Adding a `role` column later requires backfilling all existing rows.

### Option B: Future-Ready Schema (chosen)

- **Description**: Add `role` (default 'member') to `group_members`, `cover_image_url` and `max_members` (nullable) to `groups`. These columns are unused in Phase 1 but zero-cost to include.
- **Pros**: No migration needed for Phase 2 group roles, cover images, or member limits. Default values mean no impact on Phase 1 code. Nullable columns add no storage overhead when null.
- **Cons**: Slightly larger initial migration. Columns exist that aren't used yet (minor cognitive overhead).

### Option C: Separate Schema per Phase

- **Description**: Create `groups` now, defer `group_members` role and advanced columns to separate future migrations.
- **Pros**: Clean separation of concerns per phase.
- **Cons**: Multiple migrations touching the same tables. More complex migration history. The columns are trivial to add now.

## Decision

**Option B: Future-Ready Schema** — include `role`, `cover_image_url`, and `max_members` in the initial migration.

Rationale:
1. **Zero runtime cost**: Nullable columns with defaults don't affect query performance or storage
2. **Migration avoidance**: Each avoided ALTER TABLE is one less production migration to coordinate
3. **CHECK constraint on role** (`'member', 'moderator', 'owner'`) documents the future intent clearly in the schema
4. **max_members** enforcement is already implemented in the `joinGroup` server action, ready when needed

## Consequences

- Phase 2 group features (roles, covers, limits) require only UI + action changes, no schema migrations
- The `role` column on `group_members` has a CHECK constraint — adding new roles (e.g., 'admin') would still require an ALTER
- Team members see future columns in the schema and understand the scaling path
- Group chat, events, and announcements still require new tables (these are separate entities, not column additions)

## References

- FEATURES.md F10: Groups (Basic)
- SPEC.md Feature #23
- `supabase/migrations/00020_create_groups_tables.sql`
- `docs/features/groups.md`
