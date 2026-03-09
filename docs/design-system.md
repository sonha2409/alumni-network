# AlumNet — UI Design System & Component Patterns

> Reference document for ensuring visual and interaction continuity across all pages.
> Updated as new features are built. All new UI work should reference this doc.

---

## Foundation

### Stack
- **Component library**: shadcn/ui (base-nova style, neutral color palette)
- **Icons**: Lucide React
- **Styling**: Tailwind CSS (mobile-first, `dark:` prefix for dark mode)
- **Animations**: CSS transitions + Tailwind `animate-*` utilities
- **Accessibility**: WCAG 2.1 AA (semantic HTML, aria attributes, 4.5:1 contrast)

### Color Palette (Semantic)

| Purpose | Light Mode | Dark Mode | Usage |
|---------|-----------|-----------|-------|
| **Primary action** | `bg-gradient-to-r from-blue-500 to-purple-600` | Same | Connect button, primary CTAs |
| **Success / Connected** | `bg-emerald-500/10 text-emerald-600` | `dark:text-emerald-400` | Connected badge, accept button, success states |
| **Warning / Pending** | `bg-amber-500/10 text-amber-600` | `dark:text-amber-400` | Pending status, waiting states |
| **Danger / Reject** | `bg-red-500/10 text-red-600` | `dark:text-red-400` | Reject, disconnect, error states |
| **Neutral / Disabled** | `bg-muted text-muted-foreground` | Same (CSS vars) | Blocked states, disabled buttons |
| **Info** | `bg-blue-500/10 text-blue-600` | `dark:text-blue-400` | Informational badges, tips |

### Spacing & Layout
- **Page padding**: `px-4 sm:px-6 lg:px-8`
- **Section gaps**: `space-y-6` between major sections
- **Card grid**: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6`
- **Max content width**: `max-w-6xl mx-auto`

### Typography
- Uses Tailwind defaults (system font stack)
- **Page titles**: `text-2xl sm:text-3xl font-bold`
- **Section headings**: `text-lg font-semibold`
- **Card titles**: `text-base font-medium`
- **Body text**: `text-sm text-muted-foreground`
- **Badges/labels**: `text-xs font-medium`

---

## Interactive Patterns

### Buttons

| Variant | Classes | Usage |
|---------|---------|-------|
| **Primary gradient** | `bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:shadow-purple-500/25 hover:scale-105 transition-all duration-300` | Connect, primary CTAs |
| **Success** | `bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-105 transition-all duration-200` | Accept connection |
| **Danger subtle** | `bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors duration-200` | Reject, disconnect |
| **Pending** | `bg-amber-500/10 text-amber-600 cursor-default` | Request sent (non-interactive) |
| **Default** | shadcn `Button` default variant | Standard actions |
| **Ghost** | shadcn `Button` ghost variant | Secondary/overflow actions |

### Animations

| Animation | CSS | Usage |
|-----------|-----|-------|
| **Hover scale** | `hover:scale-105 transition-transform duration-200` | Interactive cards, buttons |
| **Glow shadow** | `hover:shadow-lg hover:shadow-purple-500/25 transition-shadow duration-300` | Primary gradient buttons |
| **Pulse dot** | `animate-pulse` (Tailwind built-in) | Pending status indicator |
| **Bounce badge** | `animate-bounce` | New notification/request count |
| **Fade-up entrance** | `animate-in fade-in-0 slide-in-from-bottom-2 duration-300` | Cards appearing in lists |
| **Stagger entrance** | `delay-[calc(var(--index)*75ms)]` with `animate-in` | Card grid loading |
| **State transition** | `transition-all duration-300` | Button state changes (connect → pending → connected) |
| **Tab crossfade** | `transition-opacity duration-200` | Tab content switching |

### Status Indicators

| Status | Visual | Classes |
|--------|--------|---------|
| **Connected** | Green dot + "Connected" text | `bg-emerald-500` dot, `text-emerald-600` label |
| **Pending (sent)** | Amber dot + "Request Sent" | `bg-amber-500 animate-pulse` dot, `text-amber-600` label |
| **Pending (received)** | Amber dot + "Wants to connect" | `bg-amber-500 animate-pulse` dot |
| **Blocked** | Grey state | `bg-muted text-muted-foreground opacity-60` |
| **Verified** | Green checkmark badge | `text-emerald-600` with `CheckCircle` icon |
| **Unverified** | Yellow warning | `text-amber-600` with `AlertCircle` icon |

---

## Page Patterns

### Profile View (`/profile/[id]`)

```
┌─────────────────────────────────────────┐
│  Hero Section                           │
│  ┌──────┐  Name, Grad Year, Industry   │
│  │Avatar│  Location                     │
│  └──────┘  [Connect Button] [⋯ Menu]   │
│            ↑ gradient button if no conn │
│            ↑ status badge if connected  │
├─────────────────────────────────────────┤
│  About (bio)                            │
├─────────────────────────────────────────┤
│  Availability Tags (badge pills)        │
├─────────────────────────────────────────┤
│  Career History (timeline)              │
├─────────────────────────────────────────┤
│  Education (list)                       │
└─────────────────────────────────────────┘
```

- **Own profile**: Shows "Edit Profile" button instead of connection actions
- **Other profile (verified viewer)**: Shows connection action buttons + block in overflow menu
- **Other profile (unverified viewer)**: Shows "Verify to Connect" disabled button

### Connections Page (`/connections`)

```
┌─────────────────────────────────────────┐
│  Page Title: "Connections"              │
│  ┌──────────┬──────────┬──────────┐     │
│  │Connected │Received⦿ │  Sent    │     │
│  └──────────┴──────────┴──────────┘     │
│  ↑ Tab bar, red dot on Received if any  │
├─────────────────────────────────────────┤
│  Card Grid (same style as directory)    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Profile  │ │ Profile  │ │ Profile  │  │
│  │ Card     │ │ Card     │ │ Card     │  │
│  │ [Action] │ │ [Action] │ │ [Action] │  │
│  └─────────┘ └─────────┘ └─────────┘   │
│  ↑ staggered fade-up entrance           │
├─────────────────────────────────────────┤
│  Empty State (illustration + CTA)       │
│  "No connections yet. Browse the        │
│   directory to find alumni."            │
└─────────────────────────────────────────┘
```

- **Connected tab**: Cards with "Message" (future) + "Disconnect" in overflow
- **Received tab**: Cards with "Accept" (green) + "Reject" (red) buttons, shows intro message if provided
- **Sent tab**: Cards with "Cancel Request" option, shows pending status

### Directory Cards (`/directory`)

```
┌───────────────────────┐
│  ┌──────┐             │
│  │Avatar│  Name        │
│  └──────┘  Grad Year   │
│  Industry              │
│  Location              │
│  ┌────────────┐        │
│  │ Status Dot │        │  ← green/amber dot if connected/pending
│  └────────────┘        │
│  [View Profile]        │
└───────────────────────┘
```

### Navbar Connection Badge

```
Connections [3]   ← red badge with count, animate-bounce on increment
```

---

## Component Inventory

### Shared Components (used across pages)

| Component | Location | Props | Usage |
|-----------|----------|-------|-------|
| `ConnectionActions` | `profile/[id]/connection-actions.tsx` | `targetUserId`, `connectionStatus`, `connectionId?` | Profile view page |
| `ConnectionCard` | `connections/connection-card.tsx` | `connection`, `tab` | Connections page cards |
| `ConnectionsTabs` | `connections/connections-tabs.tsx` | `counts` | Tab navigation |
| `ConnectionStatusBadge` | `components/connection-status-badge.tsx` | `status` | Directory cards, profile cards |

### Empty States

| Page | Message | CTA |
|------|---------|-----|
| Connections (Connected) | "No connections yet" | "Browse Directory" → `/directory` |
| Connections (Received) | "No pending requests" | — |
| Connections (Sent) | "No sent requests" | "Browse Directory" → `/directory` |

---

## Design Principles

1. **Consistent status colors**: Green = positive/connected, Amber = pending/waiting, Red = negative/danger, Blue/Purple = action/primary
2. **Animate meaningfully**: Transitions communicate state changes. Don't animate decoratively.
3. **Mobile-first**: All layouts must work at 375px. Buttons must be touch-friendly (min 44px tap target).
4. **Progressive disclosure**: Show primary action prominently, secondary actions in overflow menu (`...` dropdown).
5. **Feedback on every action**: Toast notification + visual state change on connect/accept/reject/block.
