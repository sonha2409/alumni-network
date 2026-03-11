# ADR-018: App Settings as Key-Value Table

**Date**: 2026-03-11
**Status**: Accepted
**Feature**: Profile Staleness / Admin Configuration

## Context

The profile staleness feature requires an admin-configurable threshold (number of months before a profile is considered stale). This is the first instance of a platform-wide setting that admins can adjust at runtime. We needed to decide how to store and expose this configuration.

## Options Considered

### Option A: Key-Value `app_settings` Table

- **Description**: A simple table with `key TEXT PRIMARY KEY` and `value JSONB`. Each setting is a row.
- **Pros**: Simple, extensible, works with RLS. Easy to add new settings without migrations. JSONB allows typed values (numbers, strings, booleans, objects).
- **Cons**: No schema enforcement per-key (validation must be in application code). No foreign keys on values.

### Option B: Typed Settings Table with Columns

- **Description**: A single-row table with a column per setting (e.g., `staleness_months INT`).
- **Pros**: Strong schema typing per setting. Database-level constraints.
- **Cons**: Requires a migration for every new setting. Single-row tables are awkward. Doesn't scale well.

### Option C: Environment Variables

- **Description**: Store the threshold as an env var, restart to change.
- **Pros**: Zero database overhead.
- **Cons**: Not runtime-configurable. Requires redeploy for changes. Not accessible to admin UI.

## Decision

**Option A** — key-value `app_settings` table with JSONB values.

The simplicity and extensibility outweigh the lack of per-key schema enforcement. Application-layer validation (Zod) handles type safety. Future settings (e.g., rate limit config, feature flags) can be added as rows without schema migrations.

## Consequences

- New settings can be added as seed data or via admin UI without migrations
- All settings validation is in server actions (Zod schemas)
- RLS allows all authenticated users to read (banner needs threshold), only admins to write
- The `updated_by` column provides an audit trail for who changed what
- No cascading foreign key support on JSONB values — referential integrity is application-level

## References

- Migration: `supabase/migrations/00030_profile_staleness.sql`
- Feature docs: `docs/features/profile-staleness.md`
