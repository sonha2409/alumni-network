# Feature: Connection System

**Date Implemented**: 2026-03-09
**Status**: Complete
**Related ADRs**: None (standard pattern, no novel decisions)

## Overview

Social connection system allowing verified alumni to send, accept, reject, and manage connections. Includes blocking functionality. Connection status is reflected across the profile view, directory cards, connections page, and navbar.

## Architecture

### Component Hierarchy

```mermaid
graph TD
    A["ConnectionsPage (Server)"] --> B["ConnectionsTabs (Client)"]
    B --> C["ConnectedList"]
    B --> D["ReceivedList"]
    B --> E["SentList"]
    B --> F["BlockedList"]
    C --> G["ConnectionCard"]
    D --> G
    E --> G
    G --> H["Action Buttons"]

    I["ProfilePage (Server)"] --> J["ConnectionActions (Client)"]
    J --> K["Connect / Accept / Reject / Disconnect / Block"]

    L["DirectoryPage (Server)"] --> M["DirectoryGrid"]
    M --> N["ProfileCard + Status Dot"]

    O["MainNavbar (Server)"] --> P["MainNavbarClient"]
    P --> Q["Connections Link + Badge"]
```

### Data Flow

```mermaid
flowchart LR
    User -->|action| ServerAction["Server Action"]
    ServerAction -->|validate| Zod["Zod Schema"]
    ServerAction -->|auth check| Auth["supabase.auth.getUser()"]
    ServerAction -->|business rules| Rules["Block/Connection checks"]
    ServerAction -->|mutate| DB["connections / blocks table"]
    DB -->|RLS filtered| Response
    ServerAction -->|revalidatePath| Cache["Next.js Cache"]
    Response -->|ActionResult| Client["Client Component"]
    Client -->|toast| Toast["Sonner Toast"]
    Client -->|optimistic state| UI["UI Update"]
```

### Database Schema

```mermaid
erDiagram
    USERS ||--o{ CONNECTIONS_REQ : "sends"
    USERS ||--o{ CONNECTIONS_REC : "receives"
    USERS ||--o{ BLOCKS_BLOCKER : "blocks"
    USERS ||--o{ BLOCKS_BLOCKED : "is blocked by"

    CONNECTIONS {
        uuid id PK
        uuid requester_id FK
        uuid receiver_id FK
        text status "pending | accepted | rejected"
        text message "optional intro, max 500"
        timestamptz created_at
        timestamptz updated_at
    }

    BLOCKS {
        uuid id PK
        uuid blocker_id FK
        uuid blocked_id FK
        timestamptz created_at
    }
```

## Key Files

| File | Purpose |
|------|---------|
| `supabase/migrations/00012_create_connections_and_blocks_tables.sql` | Schema, indexes, RLS |
| `src/lib/types.ts` | Connection, Block, RelationshipInfo types |
| `src/lib/queries/connections.ts` | Query helpers (relationship, lists, counts, status map) |
| `src/app/(main)/connections/actions.ts` | 6 server actions |
| `src/app/(main)/connections/page.tsx` | Connections page (server) |
| `src/app/(main)/connections/connections-tabs.tsx` | Tabbed UI (client) |
| `src/app/(main)/connections/loading.tsx` | Skeleton loading |
| `src/app/(main)/profile/[id]/connection-actions.tsx` | Profile connection buttons |
| `src/app/(main)/directory/directory-grid.tsx` | Status dots on cards |
| `src/components/navbar/main-navbar.tsx` | Pending count fetch |
| `src/components/navbar/main-navbar-client.tsx` | Badge display |
| `docs/design-system.md` | UI design system reference |

## Server Actions

| Action | Auth | Description |
|--------|------|-------------|
| `sendConnectionRequest` | Verified | Creates pending connection. Validates no block, no duplicate, not self. |
| `acceptConnectionRequest` | Authenticated | Receiver accepts pending request. |
| `rejectConnectionRequest` | Authenticated | Receiver rejects pending request. |
| `disconnectUser` | Authenticated | Either party deletes connection. |
| `blockUser` | Verified | Blocks user, removes any existing connection. |
| `unblockUser` | Authenticated | Removes own block. |

## RLS Policies

| Table | Operation | Rule |
|-------|-----------|------|
| connections | SELECT | User is requester or receiver |
| connections | INSERT | User is requester AND verified AND active |
| connections | UPDATE | User is receiver AND status is pending |
| connections | DELETE | User is requester or receiver |
| blocks | SELECT | User is blocker |
| blocks | INSERT | User is blocker AND verified AND active |
| blocks | DELETE | User is blocker |
| Both | ALL | Admin override |

## UI States

| Relationship | Profile View | Directory Card |
|-------------|-------------|----------------|
| None | Gradient "Connect" button | No indicator |
| Pending (sent) | Amber "Request Sent" with pulse | Amber dot |
| Pending (received) | Green "Accept" + Red "Reject" | Amber dot |
| Connected | Green "Connected" badge | Green dot with checkmark |
| Blocked by me | "Unblock" button | Not shown (hidden) |
| Unverified viewer | Disabled "Verify to Connect" | No indicator |

## Animation Details

- **Connect button**: `bg-gradient-to-r from-blue-500 to-purple-600`, hover scale + glow shadow
- **Accept button**: `bg-emerald-500`, hover scale-105
- **Pending indicator**: Animated ping dot (amber)
- **Card entrance**: Staggered fade-in-slide-up with 75ms delay per card
- **Tab switch**: Fade-in transition
- **Navbar badge**: zoom-in animation on count > 0
