# AlumNet — Implementation Strategy Plan

## Context

The project has comprehensive documentation (SPEC.md with 35 features, CLAUDE.md with dev rules) but **zero code**. All 35 features are TODO. This plan defines the build order.

## Strategy: Scaffolding-First, then Schema-Anchored Vertical Slices

Build one complete feature at a time: schema + RLS + backend logic + UI together.

### Why not pure alternatives?

| Approach | Problem for this project |
|----------|------------------------|
| **Schema-first** (all 30+ tables upfront) | Premature lock-in. You'll discover needed adjustments during implementation, creating messy "fix" migrations. Can't validate RLS without auth running. |
| **UI-first** (static screens → connect later) | RLS shapes what data is visible per role. Server Components need real data — static UI gets rewritten. shadcn/ui already provides component primitives. |
| **API-first** | No separate API layer exists — the spec uses Server Actions + Server Components. Nothing to "design" separately. |

### Why vertical slices win

1. **Schema + RLS = the contract.** In Supabase, the DB IS the backend. RLS IS authorization. Must validate per-feature with real auth tokens.
2. **Working system at every step.** After auth → working login. After profiles → working profiles. Each slice is deployable.
3. **Clean migrations.** Each feature produces 1-2 final migration files, not speculative ones.
4. **Dependencies are linear at the start** — no opportunity for parallelism until profile sub-features.

---

## Implementation Sequence

### Phase A: Foundation

#### 1. Project Scaffolding
- Initialize Next.js (App Router) + TypeScript + Tailwind CSS
- Install core deps: `@supabase/ssr`, `@supabase/supabase-js`, `zod`, `nuqs`
- Set up shadcn/ui (init + base components: Button, Input, Card, Toast, Skeleton)
- Set up route groups: `(auth)`, `(main)`, `(admin)`
- Create Supabase client utilities (server + client + middleware)
- Create `ActionResult<T>` type
- Set up Vitest + Playwright configs
- Verify build passes

#### 2. Auth (Feature #2)
- `users` table migration + RLS policies
- Signup/login/logout pages with Supabase Auth
- Auth middleware for protected routes
- Session management with `@supabase/ssr`
- Auth context provider (client-side session state)

### Phase B: Core Data

#### 3. Industry Taxonomy (Feature #10)
- `industries` + `specializations` tables + migrations + RLS
- Seed data (~20 industries, 100+ specializations)
- No UI yet — just DB + seed script

#### 4. Profiles (Feature #4)
- `profiles` table migration + RLS
- Profile create/edit forms (Server Actions + Zod validation)
- Profile view page (public vs connected view)
- Onboarding flow (post-signup progressive profile creation)
- Profile photo upload (Supabase Storage)

#### 5. Verification + Admin Queue (Features #3, #24)
- `verification_requests` table + RLS
- User submits verification request
- Admin verification queue page
- Approve/reject workflow with notifications
- Verification status banner for unverified users

#### 5b. Schools Table + School-Aware Validation (Feature #3b) ✅
- `schools` table with PTNK seed data (deterministic UUID)
- `school_id` FK added to `profiles` and `verification_requests`
- Graduation year validation dynamic from `school.first_graduating_year` (1999) to `currentYear + 3`
- Renamed `verification_requests.degree_program` → `specialization_name` (fits PTNK "chuyên ngành")
- Widened DB CHECK constraint on `profiles.graduation_year` to `>= 1900, <= current_year + 6` (school-specific range enforced at app layer)
- `getSchool()` server-side helper in `src/lib/school.ts`
- RLS: authenticated SELECT, admin UPDATE
- **Not done (deferred):** multi-school RLS, school-scoped routing, admin school management UI, i18n
- **Bug fix:** Education/career entry forms converted from uncontrolled (`defaultValue`) to controlled (`value` + `onChange`) inputs — fixes form fields being erased on validation errors (React 19 form actions reset the DOM form after submission)

### Phase C: Discovery

#### 6. Profile Sub-features (Features #5-8) — can parallelize
- Career history (multiple entries, timeline display)
- Education history
- Location (hierarchical selection)
- Availability tags

#### 7. Directory (Features #11-12)
- Full-text search with `tsvector`
- Combinable filters (industry, year, location, availability)
- Card grid results layout
- Cursor-based pagination
- URL state with `nuqs`

### Phase D: Social

#### 8. Connections (Feature #17)
- `connections` + `blocks` tables + RLS
- Send/accept/reject/disconnect flow
- Connection list page
- Block functionality

#### 9. Messaging (Feature #18)
- `conversations`, `conversation_participants`, `messages` tables + RLS
- Real-time via Supabase Realtime
- Conversation list + active chat UI
- Rate limiting (Feature #19)
- Message reporting (Feature #20)

#### 10. Notifications (Features #21-22)
- `notifications` table + RLS
- In-app: bell icon, unread count, notification dropdown
- Email: Resend integration for key events
- User notification preferences

### Phase D2: Visualization

#### 10b. Alumni World Map (Feature #28) ✅
- `latitude`, `longitude`, `location_geocoded_at` columns on profiles + partial index
- 5 RPC functions for map aggregation (country/region/city counts, admin variants, trend data)
- Geocoding utility: static country centroids (~200) + Nominatim on profile save
- `react-map-gl` + `mapbox-gl` — dynamic import with `ssr: false`
- Map page (`/map`): choropleth country view → bubble markers on drill-down
- Collapsible sidebar with filters (industry, specialization, grad year) + region stats + "View in Directory" link
- Mobile bottom sheet for sidebar
- Admin map (`/admin/map`): unverified user toggle + trend data overlay
- Geocoding integration in `updateProfile` and `completeOnboardingQuiz` (fire-and-forget)
- Backfill script: `scripts/backfill-geocoding.ts`
- Dark mode: Mapbox light/dark style switching
- Navigation: "Map" added to main navbar (after Directory) and admin navbar (after Analytics)

### Phase E: Community + Admin

#### 11. Groups (Feature #23)
- `groups` + `group_members` tables + RLS
- Browse, join, view members

#### 12. Remaining Admin Panels (Features #25-29)
- User management
- Analytics dashboard
- Taxonomy management UI
- Bulk invite (CSV upload)
- Announcements

#### 13. Moderator Features (Features #30-31)
- Report queue
- Warn/mute actions

### Phase F: Polish

#### 14. Account Management (Features #32-33)
- Soft delete + data export
- Profile staleness prompts

#### 15. Responsive Design Pass (Feature #34)
- Full responsive audit at 375px, 768px, 1024px, 1280px

#### 16. Deployment (Feature #35)
- Vercel + Supabase production setup
- Environment variables
- CI/CD pipeline
- Configure Supabase Auth SMTP for production (enable email confirmations, customize email templates, set site URL)

### Phase F2: OAuth

#### 17. Google OAuth (Feature #41)
- Enable Google provider in `supabase/config.toml` with env var substitution
- Add `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` to `.env.example`
- Create `GoogleSignInButton` client component (`src/app/(auth)/google-sign-in-button.tsx`)
- Add button + "or" divider to login and signup forms
- Add i18n translations (`auth.oauth` namespace in en.json + vi.json)
- Production: configure Google Cloud Console OAuth app + Supabase dashboard provider + auto-linking
- No migrations, no proxy/callback changes — existing PKCE flow handles OAuth

---

### Phase G: Multi-School (Phase 4 in roadmap)

#### Schools: Full Multi-Tenant Support (Feature #37)
- Add `school_id` to `users` table (school-scoped accounts)
- School-scoped RLS policies on all tables (filter by `school_id`)
- School-scoped routing (`/schools/:slug/...`)
- Per-school admin roles
- Admin UI for managing schools (Feature #38)

#### i18n: Display Language (Feature #36)
- User preference for display language (Vietnamese / English)
- Server-side translations for labels, placeholders, error messages
- Currently: English labels with Vietnamese in parentheses for school-specific terms (e.g., "Specialization (Chuyên ngành)")

---

## Key Pitfalls to Avoid

- Don't create all migrations upfront — write them per-feature
- Don't skip RLS "to move faster" — retrofitting is 10x harder
- Don't over-invest in layout shell before real pages exist
- Don't build messaging before connections (dependency chain)
- Don't install packages speculatively — add them when needed

---

## First Concrete Step

**Feature #1: Project Scaffolding** — initialize Next.js, configure Supabase local dev, install core deps, set up route groups `(auth)`, `(main)`, `(admin)`, create Supabase client utilities, create `ActionResult<T>` type, verify build passes.
