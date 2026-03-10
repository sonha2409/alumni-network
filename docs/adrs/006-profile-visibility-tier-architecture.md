# ADR-006: Profile Visibility Tier Architecture

**Date**: 2026-03-09
**Status**: Accepted
**Feature**: Profile visibility controls (Feature #9)

## Context

All authenticated users could see all profile data equally. We need a 3-tier visibility system: unverified users see minimal info, verified users see full profiles (minus contact details), and connected users / admins see everything including contact details.

The challenge: RLS can't selectively null columns within a row. If a user can SELECT a profile row, they get all columns.

## Options Considered

### Option A: RLS-Only (Separate Tables for Each Tier)

- **Description**: Split profile data across multiple tables by tier (e.g., `profile_basic`, `profile_extended`, `profile_contact`), each with its own RLS.
- **Pros**: Pure database-level enforcement. No app-layer filtering needed.
- **Cons**: Massive schema fragmentation. Requires JOINs across 3 tables for every profile view. Breaks existing `profiles` table structure. Migration nightmare.

### Option B: Hybrid (RLS for Contact Details + App-Layer for Tier 1/2)

- **Description**: New `profile_contact_details` table with strict RLS (only connected/owner/admin). Tier 1 vs Tier 2 filtering done in app layer via `getVisibilityTier()` utility.
- **Pros**: Contact details (most sensitive) are RLS-protected. Minimal schema changes. Existing `profiles` table untouched. Reusable `is_connected_to()` function.
- **Cons**: Tier 1 filtering relies on app-layer — a bug could leak bio/location to unverified users. Mitigated by the data being non-sensitive (bio, location are not PII like phone/email).

### Option C: Column-Level Security via Views

- **Description**: Create Postgres views that conditionally return NULL for restricted columns based on the caller's role/connection status.
- **Pros**: Single query returns the right data. Pure SQL enforcement.
- **Cons**: Complex view definitions. Hard to maintain. Supabase JS client doesn't work well with views that have dynamic column visibility. Performance concerns with per-row function calls in views.

## Decision

**Option B: Hybrid approach.**

- `profile_contact_details` table with RLS policies for owner, connected users (via `is_connected_to()`), and admin/moderator.
- App-layer `getVisibilityTier()` function determines tier, used by profile page and directory to conditionally skip fetching or null out restricted fields.
- `has_contact_details` boolean on `profiles` table for CTA rendering without leaking data.

## Consequences

- **Contact details are database-enforced**: Even if a bug exists in the app layer, RLS prevents unauthorized access to phone/email/social links.
- **Tier 1/2 boundary is app-enforced**: Bio, location, career history are technically accessible via Supabase client for any authenticated user. This is acceptable because this data is not sensitive PII.
- **`is_connected_to()` is reusable**: SECURITY DEFINER function will be reused by messaging (Feature #18) for "1 message before connection" rule.
- **Profile completeness weights changed**: Existing scores will shift slightly (max still 100) due to rebalanced weights. No migration needed — scores are recalculated on profile update.

## References

- SPEC.md Feature #9
- FEATURES.md visibility tier requirements
- Migration: `supabase/migrations/00013_create_profile_contact_details.sql`
