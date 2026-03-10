# ADR-010: Recommendation Engine — On-the-Fly Scoring

**Date**: 2026-03-10
**Status**: Accepted
**Feature**: Recommendation engine (Feature #13)

## Context

The platform needs a recommendation engine to suggest alumni based on shared attributes (industry, location, graduation year, company, availability, mutual connections). The scoring weights are defined in FEATURES.md F6.

Key constraints:
- Single-school deployment with expected <10k users in Phase 1
- No background job infrastructure (no pg_cron, no Edge Function cron)
- Recommendations should feel fresh — not stale cached data
- Must exclude blocked users, already-connected users, and self

## Options Considered

### Option A: Application-layer on-the-fly scoring (Postgres function)

- **Description**: A `STABLE` SQL function `get_recommended_alumni(user_id, limit)` computes scores across all candidates on every request using JOINs and CASE expressions.
- **Pros**: Zero new tables, no staleness, no background jobs, scoring logic is transparent SQL, easy to tune weights.
- **Cons**: O(n) per request where n = verified user count. Heavier query (~10-50ms for <10k users, could grow to 200ms+ at 50k+).

### Option B: Pre-computed recommendations table

- **Description**: A background job (pg_cron or Edge Function) computes top-N recommendations per user and stores them in a `recommendations` table. Dashboard reads from the table.
- **Pros**: Fast reads (indexed lookup). Decouples computation from request path.
- **Cons**: Requires scheduler infrastructure. Stale data between runs. More tables, triggers, and cache invalidation logic. Overkill for Phase 1 scale.

### Option C: Hybrid — compute on demand, cache in table

- **Description**: First request computes and stores recommendations. Profile updates invalidate the cache via trigger. Subsequent reads use cached results until invalidated.
- **Pros**: Fast reads after first computation. Fresh on profile change.
- **Cons**: Cache invalidation is complex (which changes invalidate? mutual connection changes?). More moving parts. Cold cache on first load after any change.

## Decision

**Option A — on-the-fly Postgres function.**

For a single-school deployment with <10k users, the per-request computation cost is negligible (~10-50ms). This avoids all caching infrastructure while ensuring recommendations are always fresh. The SQL function is easy to read, test, and tune.

## Scaling Path (Future)

When the platform grows beyond Phase 1 scale, migrate to Option B or C:

1. **10k–50k users**: Add a `recommended_alumni` materialized view or table. Refresh via `pg_cron` every 6 hours. Dashboard reads from the view. The scoring SQL is already written — just wrap it in a `REFRESH MATERIALIZED VIEW` call.

2. **50k+ users**: Move to Option C with targeted invalidation. Create a `user_recommendations` table with columns `(user_id, recommended_user_id, score, computed_at)`. Invalidate on:
   - Profile update (industry, location, graduation year change)
   - New connection accepted or removed
   - Availability tag change
   Use a trigger or Supabase webhook to mark recommendations stale.

3. **100k+ users (Phase 4 — multi-school)**: Consider embedding-based similarity with `pgvector`. Encode profiles as vectors, use cosine similarity for semantic matching ("Data Scientist" ≈ "ML Engineer"). Hybrid: rule-based score + vector similarity score with configurable blend weight.

4. **Performance optimizations**:
   - Add a partial index on `profiles` for `verification_status = 'verified' AND is_active = true` (via a join to users)
   - Pre-compute mutual connection counts in a materialized view
   - Limit candidate pool using coarse filters before scoring (same country, ±10 years)

## Consequences

- No new tables or infrastructure needed for Phase 1
- Recommendations are always fresh — no cache invalidation bugs
- The scoring function is the single source of truth for weights
- Performance is acceptable for <10k users but will need migration at scale
- The function signature (`get_recommended_alumni(uuid, int)`) is stable — callers won't need to change when the implementation switches to a cached approach

## References

- FEATURES.md section F6 (Recommendation Engine scoring weights)
- SPEC.md Feature #13
- Migration `00017_create_recommendation_function.sql`
