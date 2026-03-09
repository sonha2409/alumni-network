# ADR-004: Availability Tags — Junction Table vs Boolean Columns

**Date**: 2026-03-09
**Status**: Accepted
**Feature**: Profile availability tags (#8)

## Context

Users need to indicate what they're open to (mentoring, coffee chats, hiring, etc.). The spec defines 6 fixed tag types. We need to decide how to store these on profiles.

## Options Considered

### Option A: Boolean columns on profiles

- **Description**: Add 6 boolean columns (`available_for_mentoring`, `available_for_coffee_chat`, etc.) directly to the profiles table.
- **Pros**: Simplest schema, fastest queries, easiest directory filtering.
- **Cons**: Adding new tag types requires a migration + code change. Not admin-manageable.

### Option B: Junction table with reference table

- **Description**: `availability_tag_types` reference table (admin-manageable) + `user_availability_tags` junction table linking profiles to tag types.
- **Pros**: New tags can be added by admins without migrations. Follows same pattern as industry taxonomy. Extensible for future tag types.
- **Cons**: Slightly more complex queries (JOIN). Replace-all update pattern (delete + insert).

### Option C: Text array column

- **Description**: `availability_tags text[]` on profiles.
- **Pros**: Flexible, no joins.
- **Cons**: No referential integrity, harder to index for directory filtering, no admin management.

## Decision

**Option B: Junction table** — chosen for extensibility and consistency with the taxonomy pattern. The project already has admin taxonomy management planned (Feature #27), and this pattern allows availability tags to be managed the same way. The marginal query complexity is negligible.

## Consequences

- Admin can add/archive tag types without schema changes
- Directory filtering requires a JOIN to `user_availability_tags`, but can be optimized with indexes on `tag_type_id`
- Update pattern is delete-all + insert-selected (atomic within a single Server Action)
- Seeded with 6 initial tag types matching the spec

## References

- SPEC.md Feature #8
- FEATURES.md F3 — Availability Tags section
