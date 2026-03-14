# AlumNet Performance Optimization Plan

> **Created:** 2026-03-14
> **Status:** Active
> **Context:** <100 users, some pages take up to 3 seconds to load. 10 optimizations identified.

---

## Priority Matrix

| Priority | Item | Impact | Effort | Status |
|----------|------|--------|--------|--------|
| P0 | Message unread N+1 | Critical | 2h | **Done** (2026-03-14) |
| P1 | Image optimization | High | 4h | **Done** (2026-03-14) |
| P2 | Query consolidation | High | 3h | **Done** (2026-03-14) |
| P3 | Dashboard parallelization | Medium | 1.5h | **Done** (2026-03-14) |
| P4 | Proxy query reduction | Medium | 1h | **Done** (2026-03-14) |
| P5 | Lazy-load Recharts | Medium | 15min | **Done** (2026-03-14) |
| P6 | Cache taxonomy data | Medium | 2h | **Done** (2026-03-14) |
| P7 | Profile page parallelization | Low-Med | 1h | **Done** (2026-03-14) |
| P8 | Supabase client singleton | Low | 15min | **Done** (2026-03-14) |
| P9 | Missing DB indexes | Low | 30min | **Done** (2026-03-14) |
| P10 | Conversations RPC | Medium | 4h | **Done** (2026-03-14) |

**Recommended implementation order:** P5 → P8 → P9 → P4 → P6 → P3 → P2 → P0+P10 → P7 → P1

Quick wins first, then medium effort, then the two paired message optimizations, then image overhaul last.

---

## P0 — Message Unread Count N+1 (CRITICAL)

**Status:** Done (2026-03-14)

### Problem

`getUnreadCountsForConversations()` at `src/lib/queries/messages.ts:269-293` loops 1 sequential query per conversation. `getTotalUnreadCount()` at lines 206-233 fires N parallel queries via `Promise.all`. A user with 50 conversations triggers 50+ DB queries.

### Solution

Create a `get_unread_counts(p_user_id uuid)` RPC function using a single `SELECT ... GROUP BY conversation_id`. Replace both functions to call the RPC once.

```sql
CREATE OR REPLACE FUNCTION get_unread_counts(p_user_id uuid)
RETURNS TABLE(conversation_id uuid, unread_count bigint) AS $$
  SELECT m.conversation_id, COUNT(*) as unread_count
  FROM messages m
  JOIN conversation_participants cp
    ON cp.conversation_id = m.conversation_id
    AND cp.user_id = p_user_id
  WHERE m.sender_id != p_user_id
    AND m.created_at > cp.last_read_at
  GROUP BY m.conversation_id;
$$ LANGUAGE sql SECURITY DEFINER;
```

```typescript
// src/lib/queries/messages.ts
export async function getUnreadCountsForConversations(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_unread_counts", {
    p_user_id: userId,
  });
  if (error) throw error;
  return Object.fromEntries(
    (data ?? []).map((r) => [r.conversation_id, r.unread_count])
  );
}

export async function getTotalUnreadCount(userId: string) {
  const counts = await getUnreadCountsForConversations(userId);
  return Object.values(counts).reduce((sum, c) => sum + c, 0);
}
```

### Impact

N queries → 1 query. Biggest single improvement.

### Effort

~2 hours (1 migration + 2 query function refactors)

### Files

- `src/lib/queries/messages.ts`
- New migration

---

## P1 — Image Optimization (HIGH)

**Status:** Done (2026-03-14)

### Problem

24 files use raw `<img>` tags. Zero `next/image` usage. No lazy loading, no WebP conversion, no responsive srcSet. Full-resolution avatars served from Supabase Storage.

### Solution

Hybrid approach:

1. Replace all `<img>` with `next/image` `<Image>` component (auto lazy-loading, WebP conversion, responsive srcSet). Supabase remote patterns already configured in `next.config.ts`.
2. When on Supabase Pro: also use Supabase image transforms for thumbnail URLs via a `getImageUrl()` helper.

```typescript
// src/lib/image.ts
export function getImageUrl(
  url: string,
  options?: { width?: number; height?: number }
) {
  if (!url || !options) return url;
  const { width, height } = options;
  // Supabase Pro image transforms
  const params = new URLSearchParams();
  if (width) params.set("width", String(width));
  if (height) params.set("height", String(height));
  params.set("format", "webp");
  return `${url}?${params.toString()}`;
}
```

```tsx
// Example replacement
// Before:
<img src={user.photoUrl} alt={user.name} className="w-12 h-12 rounded-full" />

// After:
<Image
  src={user.photoUrl}
  alt={user.name}
  width={48}
  height={48}
  className="rounded-full"
/>
```

### Impact

Reduced image transfer size, automatic lazy loading, better LCP scores.

### Effort

~4 hours (mechanical replacement across 24 files + helper function)

### Files

All files with `<img>` across dashboard, directory, profile, messages, connections, groups, and navbar components.

---

## P2 — Directory & Recommendations Query Consolidation (HIGH)

**Status:** Done (2026-03-14)

### Problem

Both `searchDirectory()` (`src/lib/queries/directory.ts:161-203`) and `getRecommendedAlumni`/`getPopularAlumni`/`getFallbackAlumni` (`src/lib/queries/recommendations.ts`) fire 2 follow-up queries after the main query to fetch `career_entries` (current job) and `user_availability_tags`. Dashboard loads fire 6+ queries total for recommendations alone.

Shared helpers at `src/lib/queries/recommendations.ts:248-300` (`fetchCurrentCareers`, `fetchAvailabilityTags`) are called after each main query.

### Solution

**Directory:** Use PostgREST nested select to include career data inline. For tags, use junction table nested select.

```typescript
// src/lib/queries/directory.ts — searchDirectory
const { data } = await supabase
  .from("profiles")
  .select(`
    *,
    career_entries!inner(company, title, is_current),
    user_availability_tags(availability_tag_types(name, category))
  `)
  .eq("career_entries.is_current", true)
  // ... other filters
```

**Recommendations RPCs** (`get_recommended_alumni`, `get_popular_alumni`): Add `LEFT JOIN LATERAL` to include `career_entries` (current) and aggregate availability tags directly in the RPC return type.

```sql
-- In get_recommended_alumni RPC
SELECT p.*,
  ce.company as current_company, ce.title as current_title,
  COALESCE(tags.tag_names, '{}') as availability_tags
FROM profiles p
LEFT JOIN LATERAL (
  SELECT company, title FROM career_entries
  WHERE user_id = p.user_id AND is_current = true
  LIMIT 1
) ce ON true
LEFT JOIN LATERAL (
  SELECT array_agg(att.name) as tag_names
  FROM user_availability_tags uat
  JOIN availability_tag_types att ON att.id = uat.tag_type_id
  WHERE uat.user_id = p.user_id
) tags ON true
-- ... rest of recommendation logic
```

Remove `fetchCurrentCareers()` and `fetchAvailabilityTags()` helpers after consolidation.

### Impact

Dashboard: 8 queries → 4. Directory: 3 queries → 1.

### Effort

~3 hours (modify 2 RPC functions via migration + refactor 2 query files)

### Files

- `src/lib/queries/directory.ts`
- `src/lib/queries/recommendations.ts`
- New migration to update RPC functions

---

## P3 — Dashboard Sequential Query Bottleneck (MEDIUM)

**Status:** Done (2026-03-14)

### Problem

`src/app/(main)/dashboard/page.tsx:16` fetches profile first (blocking), then lines 33-36 fire recommendations in parallel, then line 44 fetches connection statuses. 3 sequential stages.

### Solution

Move `profile_completeness` lookup into the `get_recommended_alumni` RPC (it can query the profiles table internally). Then run all initial queries in parallel:

```typescript
// src/app/(main)/dashboard/page.tsx
const [profile, recommendations, popularAlumni] = await Promise.all([
  getProfileByUserId(user.id),
  getRecommendedAlumni(user.id, 20),  // RPC handles cold-start internally
  getPopularAlumni(user.id, 10),
]);
```

### Impact

Eliminates ~200-400ms sequential wait. 3 stages → 2 stages.

### Effort

~1.5 hours (refactor page + modify RPC to look up profile_completeness)

### Dependency

Can be combined with P2 migration (same RPCs being modified).

### Files

- `src/app/(main)/dashboard/page.tsx`
- `src/lib/queries/recommendations.ts`
- Migration to update RPC

---

## P4 — Proxy Per-Request Query Overhead (MEDIUM)

**Status:** Done (2026-03-14)

### Problem

`src/proxy.ts` runs 2 DB queries per authenticated request:

1. Lines 112-116: `SELECT is_active, suspended_until, deleted_at FROM users`
2. Lines 191-194: `SELECT id FROM profiles WHERE user_id = ... (count)`

Plus a duplicate user query at lines 154-158 for status pages.

### Solution

Combine into a single query using PostgREST relationship syntax:

```typescript
// src/proxy.ts
const { data } = await supabase
  .from("users")
  .select("is_active, suspended_until, deleted_at, profiles(id)")
  .eq("id", user.id)
  .single();

// data.profiles will be null/empty if no profile exists
const hasProfile = Array.isArray(data.profiles)
  ? data.profiles.length > 0
  : !!data.profiles;
```

Remove the separate profile count query at lines 191-194.

### Impact

2 queries → 1 per request. On a page with multiple navigations, saves significant overhead.

### Effort

~1 hour

### Files

- `src/proxy.ts`

---

## P5 — Lazy-Load Recharts (MEDIUM)

**Status:** Done (2026-03-14)

### Problem

`src/app/(admin)/admin/analytics/analytics-dashboard.tsx:1-16` imports `recharts` (~130KB gzipped) at top level. Only admin users visit this page, but the bundle is included for all users.

### Solution

Dynamic import in the parent page:

```typescript
// src/app/(admin)/admin/analytics/page.tsx
import dynamic from "next/dynamic";

const AnalyticsDashboard = dynamic(
  () =>
    import("./analytics-dashboard").then((m) => m.AnalyticsDashboard),
  { loading: () => <AnalyticsLoading /> }
);
```

Ensure `analytics-dashboard.tsx` uses a named export if it doesn't already.

### Impact

~130KB removed from initial bundle for non-admin users.

### Effort

~15 minutes

### Files

- `src/app/(admin)/admin/analytics/page.tsx`
- `src/app/(admin)/admin/analytics/analytics-dashboard.tsx` (add named export if needed)

---

## P6 — Cache Shared Taxonomy Data (MEDIUM)

**Status:** Done (2026-03-14)

### Problem

Industries, specializations, availability tag types, and school data are identical for all users but re-fetched on every request. `src/lib/school.ts:7` explicitly notes: "Cannot use unstable_cache because createClient() reads cookies()."

### Solution

Use `unstable_cache` with `createServiceClient()` (bypasses RLS, no cookies dependency):

```typescript
import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";

export const getCachedSchool = unstable_cache(
  async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("schools")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .single();
    return data;
  },
  ["school-data"],
  { revalidate: 3600 }
);

// Similarly for:
// getCachedIndustries, getCachedSpecializations, getCachedTagTypes
```

Keep original functions for mutations where fresh data is needed.

### Impact

Eliminates repeated DB queries for taxonomy/school data across all users. Particularly impactful on pages with filters (directory, map, onboarding, profile edit).

### Effort

~2 hours

### Files

- `src/lib/school.ts`
- `src/lib/queries/taxonomy.ts` (or wherever industries/specializations are fetched)
- Filter components that load tag types

---

## P7 — Profile Page Sequential Queries (LOW-MEDIUM)

**Status:** Done (2026-03-14)

### Problem

`src/app/(main)/profile/[id]/page.tsx` runs profile → visibility tier → relationship sequentially before parallelizing 4 conditional queries.

### Solution

Fetch profile and relationship info in parallel (relationship only needs two user IDs, not the full profile object). Derive visibility tier from relationship data.

```typescript
// src/app/(main)/profile/[id]/page.tsx
const [profile, relationship] = await Promise.all([
  getProfileById(id),
  getRelationship(currentUserId, targetUserId),
]);

const visibilityTier = deriveVisibilityTier(relationship, profile);

// Then parallelize conditional queries as before
```

### Impact

Saves ~100-200ms per profile view.

### Effort

~1 hour

### Files

- `src/app/(main)/profile/[id]/page.tsx`

---

## P8 — Supabase Browser Client Singleton (LOW)

**Status:** Done (2026-03-14)

### Problem

`src/lib/supabase/client.ts` creates a new `BrowserClient` on every call. `MessagesProvider`, `UnreadMessagesProvider`, and `NotificationsProvider` each create separate instances, resulting in separate WebSocket connections.

### Solution

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
```

### Impact

Reduces WebSocket connections from 3-4 to 1. Minor memory savings.

### Effort

~15 minutes

### Files

- `src/lib/supabase/client.ts`

---

## P9 — Missing Database Indexes (LOW)

**Status:** Done (2026-03-14)

### Problem

`FEATURES.md` "Post-Launch Hardening" section lists 4 missing indexes:

- `notifications(user_id, is_read)` — bulk mark-all-read
- `message_reports(reporter_id)` — reporter history
- `dismissed_announcements(user_id)` — announcement dismissal
- `user_warnings(moderator_id)` — moderator action history

### Solution

Single migration adding all 4 indexes:

```sql
-- supabase/migrations/NNNNN_add_missing_indexes.sql

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, is_read);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_reports_reporter
  ON message_reports(reporter_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dismissed_announcements_user
  ON dismissed_announcements(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_warnings_moderator
  ON user_warnings(moderator_id);
```

### Impact

Faster notification reads, announcement dismissals, moderation queries.

### Effort

~30 minutes

### Files

- New migration file

---

## P10 — Conversations List RPC (MEDIUM)

**Status:** Done (2026-03-14)

### Problem

`getConversations()` at `src/lib/queries/messages.ts:8-119` runs 4+ sequential/nested queries: participations → conversations → other participants → profiles → unread counts (N+1 from P0).

### Solution

Create `get_user_conversations(p_user_id, p_page, p_page_size)` RPC that returns conversations with participant profiles, last message preview, and unread count in one query using lateral joins:

```sql
CREATE OR REPLACE FUNCTION get_user_conversations(
  p_user_id uuid,
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 20
)
RETURNS TABLE(
  conversation_id uuid,
  last_message_at timestamptz,
  last_message_preview text,
  is_active boolean,
  created_at timestamptz,
  other_user_id uuid,
  other_full_name text,
  other_photo_url text,
  other_profile_id uuid,
  unread_count bigint,
  is_muted boolean
) AS $$
  SELECT
    c.id as conversation_id,
    c.last_message_at,
    c.last_message_preview,
    c.is_active,
    c.created_at,
    op.user_id as other_user_id,
    p.full_name as other_full_name,
    p.photo_url as other_photo_url,
    p.id as other_profile_id,
    COALESCE(unread.cnt, 0) as unread_count,
    cp.is_muted
  FROM conversation_participants cp
  JOIN conversations c ON c.id = cp.conversation_id AND c.is_active = true
  JOIN conversation_participants op
    ON op.conversation_id = c.id AND op.user_id != p_user_id
  LEFT JOIN profiles p ON p.user_id = op.user_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as cnt
    FROM messages m
    WHERE m.conversation_id = c.id
      AND m.created_at > cp.last_read_at
      AND m.sender_id != p_user_id
  ) unread ON true
  WHERE cp.user_id = p_user_id
  ORDER BY c.last_message_at DESC NULLS LAST
  LIMIT p_page_size OFFSET (p_page - 1) * p_page_size;
$$ LANGUAGE sql SECURITY DEFINER;
```

### Impact

4+ queries → 1 query for conversation list. Pairs with P0.

### Effort

~4 hours (complex RPC + refactor provider)

### Dependency

Implement alongside P0 (both fix messages query patterns).

### Files

- `src/lib/queries/messages.ts`
- New migration

---

## Future Infrastructure Considerations

These items are not prioritized yet but should be addressed as the platform scales:

### CDN/Edge Caching for Map Data
Country-level aggregation data rarely changes. Add `Cache-Control` headers on a dedicated API route to serve cached map data from the edge.

### Database Connection Pooling
Ensure PgBouncer is properly configured when upgrading to Supabase Pro. Vercel serverless functions create many short-lived connections that can exhaust the connection pool.

### React cache() for Request Deduplication
Use `React.cache()` to deduplicate the same query within a single request lifecycle. For example, `getUser()` is often called in both the layout and page — wrapping it in `React.cache()` ensures it only hits the database once per request.

```typescript
import { cache } from "react";

export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});
```

---

## Verification Plan

After each optimization is implemented:

1. **Build check:** `node node_modules/next/dist/bin/next build` — no build errors
2. **Query count:** Browser DevTools Network tab — measure query count before/after
3. **Query performance:** Supabase Dashboard SQL Editor → `EXPLAIN ANALYZE` for new/modified queries
4. **Core Web Vitals:** Lighthouse audit for LCP, CLS, FID
5. **Responsive test:** Manual test affected pages at 375px and 1280px widths
