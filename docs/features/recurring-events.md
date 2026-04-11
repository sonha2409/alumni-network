# F47d: Recurring Events (Weekly/Monthly)

## Overview

Allows organizers to create repeating events that materialize individual occurrence rows, each with independent RSVPs, comments, and check-ins. Supports scoped editing and cancellation.

## Architecture

### Materialized Row Strategy

Rather than virtual expansion (computing occurrences on-the-fly), the system creates real `events` rows at series creation time. This keeps all existing queries, RLS policies, and features (RSVP, comments, check-in, notifications) working unchanged.

```mermaid
erDiagram
    event_series ||--o{ events : "series_id"
    events ||--o{ event_rsvps : "event_id"
    events ||--o{ event_comments : "event_id"
    events ||--o{ event_checkins : "event_id"

    event_series {
        uuid id PK
        uuid creator_id FK
        text rrule "weekly | monthly"
        smallint interval_val "1-4"
        date until_date
        text base_title
        timestamptz deleted_at
    }

    events {
        uuid series_id FK "nullable"
        smallint series_index "0-based"
    }
```

### Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as EventForm
    participant A as createEventSeries
    participant DB as Supabase

    U->>F: Fill form + enable "Recurring"
    F->>A: seriesInput (event fields + rrule, interval, until_date)
    A->>A: materializeOccurrenceDates()
    A->>DB: INSERT event_series
    A->>DB: INSERT N events (series_id, series_index 0..N-1)
    A-->>F: { series, events[] }
    F->>U: Redirect to first occurrence
```

### Scoped Edit Flow

```mermaid
flowchart TD
    A[User edits series occurrence] --> B{Select scope}
    B -->|This only| C[Update single event row]
    B -->|This + following| D[Split series]
    B -->|All future| E[Update all future occurrences]

    D --> D1[Close original series at prev occurrence]
    D1 --> D2[Create new series from this occurrence]
    D2 --> D3[Move this + following to new series]
    D3 --> D4[Apply field changes + re-index]
```

### Scoped Cancel Flow

```mermaid
flowchart TD
    A[User cancels series occurrence] --> B{Select scope}
    B -->|This only| C[Soft-delete single event]
    B -->|All future| D[Soft-delete this + later occurrences]
    D --> E[Soft-delete event_series row]
    C --> F[Notify affected RSVPs]
    D --> F
```

## Key Files

| File | Purpose |
|------|---------|
| `supabase/migrations/00049_event_series_f47d.sql` | Schema, RLS, RPC |
| `src/lib/types.ts` | `EventSeriesRow`, updated `EventRow` |
| `src/app/(main)/events/schemas.ts` | `seriesInputSchema`, scope types |
| `src/app/(main)/events/series-actions.ts` | Create/edit/cancel series actions |
| `src/app/(main)/events/event-form.tsx` | Recurring toggle + edit scope UI |
| `src/app/(main)/events/[id]/host-actions.tsx` | Cancel scope dialog |
| `src/app/(main)/events/[id]/series-nav.tsx` | Prev/next occurrence navigation |

## Occurrence Generation

- **Weekly**: Advances by `7 * interval_val` days
- **Monthly**: Advances by `interval_val` months, clamping to last day (e.g. Jan 31 + 1mo = Feb 28)
- **Cap**: 52 occurrences maximum (`MAX_SERIES_OCCURRENCES`)
- **Minimum**: 2 occurrences required (otherwise use a single event)

## Edge Cases

- Monthly on 31st: clamped to last day of shorter months
- Past occurrences: never modified by "all" or "this_and_following" scope edits
- Series split: original series `until_date` set to day before the split point; new series inherits original `until_date`
- Cancel "all future": uses selected occurrence's `start_time` as cutoff (not `now()`), preserving earlier future occurrences
- Rate limit: series bypass the 3/7-day per-event limit but cap at 52 total occurrences
