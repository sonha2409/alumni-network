# ADR-003: Profile Onboarding — Two-Phase Approach

**Date**: 2026-03-09
**Status**: Accepted
**Feature**: Profile Create & Edit (F4)

## Context

After signup, users need to create their profile. The spec calls for "progressive profile creation" — required fields first, then optional details later. We need to decide how to structure this UX.

## Options Considered

### Option A: Multi-step wizard

- **Description**: 3-step wizard with progress indicator. Step 1: Name + Grad Year. Step 2: Industry + Specialization. Step 3: Photo + Bio.
- **Pros**: Less overwhelming, guided experience, common onboarding pattern.
- **Cons**: More UI complexity, partial profile states to handle between steps, back/forward navigation logic.

### Option B: Single-page form

- **Description**: One form with all fields. Required fields marked with asterisks, optional fields available immediately.
- **Pros**: Simple implementation, user sees everything at once.
- **Cons**: Overwhelming for onboarding, doesn't feel "progressive."

### Option C: Two-phase approach

- **Description**: Phase 1 (onboarding) is a compact form with only the 3 required fields (name, grad year, industry) plus optional photo. Phase 2 is the full edit page with all fields organized in sections.
- **Pros**: Fast onboarding (< 30 seconds), no partial profile states, full editing available later, minimal UI complexity.
- **Cons**: Two slightly different form UIs to maintain.

## Decision

**Option C: Two-phase approach.** The onboarding form captures only what's needed to create a useful profile (name, year, industry). The edit page handles everything else. This matches the spec's "progressive" intent — start simple, enhance later — without the complexity of a multi-step wizard.

The proxy enforces the onboarding gate: authenticated users without a profile are redirected to `/onboarding` on every request to a protected route.

## Consequences

- Users complete onboarding in < 30 seconds with just 3 required fields.
- No partial profile states — every profile in the DB has all required fields.
- Profile completeness starts at 45% (3 required fields = 15+15+15 points) and encourages filling in the rest.
- Two form components exist (OnboardingForm and ProfileEditForm) but they share the same Server Action patterns and validation schemas.
- The proxy makes an additional DB query per request for authenticated users. This is acceptable since the query is indexed (user_id UNIQUE) and will be eliminated once the user creates their profile.

## References

- FEATURES.md — Feature F4: Profile System
- SPEC.md — profiles table schema
- `src/proxy.ts` — onboarding redirect logic
