# Feature: [Feature Name]

**Date Implemented**: YYYY-MM-DD
**Status**: Complete | In Progress
**Related ADRs**: ADR-XXX, ADR-YYY

## Overview

Brief description of what this feature does and which user roles it serves.

## Architecture

### Component Hierarchy

```mermaid
graph TD
    A[Page Component] --> B[Child Component A]
    A --> C[Child Component B]
    B --> D[Shared Component]
```

### Data Flow

```mermaid
flowchart LR
    Client -->|Server Action| ServerAction
    ServerAction -->|Query/Mutation| Supabase
    Supabase -->|RLS filtered| ServerAction
    ServerAction -->|Response| Client
```

### Database Schema *(if applicable)*

```mermaid
erDiagram
    TABLE_A {
        uuid id PK
        timestamp created_at
        timestamp updated_at
    }
    TABLE_B {
        uuid id PK
        uuid table_a_id FK
    }
    TABLE_A ||--o{ TABLE_B : "has many"
```

### Sequence Diagram *(for multi-step flows)*

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant Server
    participant DB as Supabase

    User->>Client: Action
    Client->>Server: Server Action call
    Server->>DB: Query
    DB-->>Server: Result
    Server-->>Client: Response
    Client-->>User: UI Update
```

## Key Files

| File | Purpose |
|------|---------|
| `app/(group)/route/page.tsx` | Main page component |
| `app/(group)/route/actions.ts` | Server actions |
| `app/(group)/route/components/` | Route-specific components |
| `supabase/migrations/XXXXX_name.sql` | Schema migration |

## RLS Policies

| Table | Policy | Roles | Description |
|-------|--------|-------|-------------|
| `table_name` | `select` | authenticated | Users can read their own rows |

## Edge Cases and Error Handling

- **Case 1**: Description and how it's handled.
- **Case 2**: Description and how it's handled.

## Design Decisions

Brief notes on why things were built this way. Link to ADRs for significant decisions.

## Future Considerations

Known limitations or planned improvements for later phases.
