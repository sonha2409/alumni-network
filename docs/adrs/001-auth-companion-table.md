# ADR 001: Companion `public.users` Table for Auth

**Status**: Accepted
**Date**: 2026-03-08
**Context**: Feature #2 (Authentication)

## Decision

Create a `public.users` table as a companion to Supabase's `auth.users`, linked via `id` (FK with `on delete cascade`). A Postgres trigger auto-creates the `public.users` row on every `auth.users` insert.

## Context

Supabase Auth manages `auth.users` (email, password, JWT). We need app-specific fields (`role`, `verification_status`, `is_active`, `deleted_at`) accessible via RLS policies.

## Options Considered

### A. Single merged `profiles` table
Combine role/verification fields with profile fields.
- **Pro**: Fewer joins
- **Con**: Mixes auth concerns with profile data; diverges from SPEC data model

### B. Separate `public.users` table (chosen)
Auth-related fields in `public.users`, profile data in `public.profiles` (created in Feature #4).
- **Pro**: Matches SPEC data model; clean separation of concerns; role/verification queries don't need profile data
- **Con**: Extra join when needing both user + profile data

### C. Supabase Auth metadata only
Store role/verification in `auth.users.raw_app_meta_data`.
- **Pro**: No extra table
- **Con**: Can't use in RLS policies without custom functions; can't query/filter by role efficiently

## Consequences

- All future tables that reference users should FK to `public.users(id)`, not `auth.users(id)`.
- The `handle_updated_at()` trigger function is defined once here and reused for all future tables.
- Every authenticated user is guaranteed to have a `public.users` row (trigger-based creation).
- Role and verification status are queryable via standard SQL and usable in RLS policies.
