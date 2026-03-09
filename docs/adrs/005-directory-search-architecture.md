# ADR-005: Alumni Directory Search Architecture

**Date**: 2026-03-09
**Status**: Accepted
**Context**: Feature #11-12 — Alumni Directory with search, filters, and pagination

## Decision

Use **Server Components + URL searchParams + nuqs** for the alumni directory, with **Postgres tsvector** for full-text search and **offset-based pagination**.

## Context

Needed to choose between:
1. Server Component with searchParams (Option A)
2. Client-side fetching via Server Action (Option B)
3. Hybrid server + client (Option C)

And between:
- Offset-based vs cursor-based pagination
- tsvector vs LIKE/ILIKE for search
- `@base-ui/react` Select vs native `<select>` for filter dropdowns

## Rationale

### Server Components + searchParams
- **Standard pattern** for search/filter pages in Next.js App Router
- URL is the single source of truth — bookmarkable, shareable, SEO-friendly
- `loading.tsx` provides automatic suspense boundaries during re-renders
- Scales to caching (`unstable_cache`), streaming, and edge runtime without architectural changes

### Offset-based pagination
- Simpler implementation for combinable filters + sort options
- Enables "jump to page N" UX
- Adequate for expected scale (< 10k profiles in Phase 1)
- Migration to cursor-based requires only changing the query helper — URL contract and UI stay the same

### tsvector for search
- Native Postgres full-text search — no external service dependency
- GIN index provides fast lookups
- Weighted vectors (A = name, C = bio) give sensible relevance ranking
- `websearch_to_tsquery` handles natural language input safely

### Native `<select>` over `@base-ui/react` Select
- The `@base-ui/react` Select component renders the raw `value` (UUID) in the trigger when the value is set externally (e.g., from URL params on initial load), instead of the display label
- Native `<select>` always shows the correct `<option>` text regardless of how the value is set
- Consistent with the existing profile edit form pattern in the codebase
- Tradeoff: less styled, but functional and reliable

## Consequences

- Directory page fully server-rendered — good for performance, bad for instant filter feedback (mitigated by loading skeleton)
- `nuqs` added as a runtime dependency for URL state management (already installed, first usage)
- Offset pagination will degrade at very large scale — planned migration path documented
- Career data (job title, company) not included in tsvector — searched via separate query, not ranked by relevance

## Alternatives Rejected

- **Client-side fetching**: Loses SSR benefits, requires manual loading/error state management
- **Hybrid approach**: Two data-fetching paths to maintain, premature complexity
- **Cursor-based pagination**: Over-engineering for Phase 1 scale, harder to implement with combinable filters and sort
- **LIKE/ILIKE search**: No relevance ranking, poor performance without trigram indexes
