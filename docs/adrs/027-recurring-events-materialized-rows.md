# ADR-027: Recurring Events — Materialized Rows

## Status
Accepted (2026-04-11)

## Context
F47d requires recurring events (weekly/monthly). Two approaches were considered:

1. **Materialized rows**: Create real `events` rows at series creation time, linked via `series_id` FK.
2. **Virtual expansion**: Store only the recurrence rule; expand occurrences on-the-fly at query time.

## Decision
Use materialized rows.

## Rationale
- All existing features (RSVP, comments, check-in, notifications, group linkage, radius notifications) work unchanged — they already reference `events.id`.
- Existing RLS policies, indexes, and queries require no modification.
- Row count is modest: max 52 per series (weekly for a year).
- Virtual expansion would require rewriting every query that touches events to handle synthetic rows, adding significant complexity for minimal storage savings.

## Consequences
- Creating a series inserts N rows (up to 52), which is a slightly heavier write operation.
- Series-wide operations (edit all, cancel all) require batch updates rather than a single rule change.
- The `event_series` table stores metadata (rrule, interval, until_date) for series management and splitting.
- Series splitting (for "this and following" edits) creates a new `event_series` row and re-parents affected events.
