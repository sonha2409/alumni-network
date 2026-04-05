# AlumNet — Feature Requirements

> Deep-dive functional requirements for each feature. For status tracking, see `SPEC.md`. For build order, see `PLAN.md`.

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Features (F1–F13)](#features)
4. [Non-Functional Requirements](#non-functional-requirements)
5. [UI/UX Guidelines](#uiux-guidelines)
6. [Future Scaling Path](#future-scaling-path)

---

## Core Concepts

### What is AlumNet?
A web platform where verified alumni of a single school can discover and connect with each other based on career field, education, location, and professional interests. Think "LinkedIn, but scoped to your school and focused on alumni-to-alumni connections."

### Key Principles
- **Verified community**: Only confirmed alumni get full access. Trust is the foundation.
- **Progressive engagement**: Low-friction signup → nudge toward rich profiles → meaningful connections.
- **Privacy by default**: Contact details hidden until connected. Users control their visibility.
- **Ship lean, scale later**: Start with free-tier infrastructure and simple algorithms. Design for future upgrades.

---

## User Roles & Permissions

### Regular User (Unverified)
- Can sign up and create a basic profile
- Can browse alumni directory (names, photos, field, graduation year only)
- **Cannot** message, connect, or see detailed profiles
- Sees a banner prompting verification

### Regular User (Verified)
- Full directory access with search and filters
- Can send/accept connection requests
- Can message connected alumni (real-time)
- Can join groups
- Can set availability tags and visibility controls
- Can export and delete their account

### Moderator
- Everything a verified user can do, plus:
- Access to the **report queue** (flagged messages)
- Can **warn** or **mute** users (temporary)
- Cannot ban, delete users, or access admin settings

### Admin
- Everything a moderator can do, plus:
- **Verification queue**: approve/reject alumni signups
- **User management**: ban, suspend, delete accounts
- **Taxonomy management**: add/edit industry categories and specializations
- **Bulk invite**: upload CSV of alumni emails to send invitations
- **Announcements**: create platform-wide notices
- **Analytics dashboard**: signups, active users, connections, messages
- **Data export**: export platform data

---

## Features

### F1. Authentication
- **Signup**: email + password via Supabase Auth
- **Login**: email + password, with "forgot password" flow
- **OAuth**: Google (Sign in with Google). LinkedIn deferred.
- **Session management**: JWT-based via Supabase, auto-refresh
- After signup, user lands on onboarding flow (not the main app)

#### Server-Side Auth Details
- **`public.users` table**: A companion table to Supabase's `auth.users`. Stores app-specific fields (`role`, `verification_status`, `is_active`, `deleted_at`). Linked via `id` referencing `auth.users.id` with `on delete cascade`.
- **Auto-creation trigger**: A Postgres trigger (`on_auth_user_created`) fires after every `auth.users` insert and creates the corresponding `public.users` row with defaults (`role: 'user'`, `verification_status: 'unverified'`, `is_active: true`).
- **`updated_at` trigger**: A Postgres trigger (`on_users_updated`) automatically sets `updated_at = now()` on every `public.users` update. This pattern is reused for all tables with `updated_at`.
- **Email confirmation**: Disabled in development (Supabase default for local dev). In production, Supabase's email confirmation can be enabled via the dashboard — the signup flow already handles the case where `data.user` may not have a confirmed session.
- **Password reset flow**: Uses Supabase's `resetPasswordForEmail()` which sends a magic link. The link redirects to `/auth/callback?next=/reset-password` where a route handler exchanges the code for a session. The reset password response always returns success to prevent email enumeration.
- **Reset password page** (`/reset-password`): Dedicated page where users land after clicking the password reset email link. Authenticated page (user has a session from the code exchange).
- **Auth callback route** (`/auth/callback`): Handles code exchange for all Supabase email flows (password reset, email verification). Redirects to the `next` query param on success, or `/login` on failure.
- **Middleware session refresh**: The Next.js middleware calls `supabase.auth.getUser()` on every request. This is mandatory — it refreshes the JWT token and ensures Server Components receive a valid session.
- **RLS dependency**: All RLS policies on `public.users` (and future tables) use `auth.uid()` to identify the current user. The middleware's session refresh ensures `auth.uid()` is always current.
- **Validation**: All auth Server Actions validate input with Zod before calling Supabase. The signup action validates email format, password min length (8 chars), and password confirmation match. Login validates email format and password presence.
- **Error handling**: Auth Server Actions return `ActionResult<T>`. Supabase errors are logged server-side with structured format (`[ServerAction:actionName]`) and sanitized before returning to the client. Specific errors (e.g., "already registered") are mapped to user-friendly messages.

#### Production Email Configuration
- **Supabase Auth emails** (registration confirmation, password reset) use Supabase's built-in email service
- **Local dev**: Emails captured by Inbucket (http://localhost:54324) — no real emails sent
- **Production setup**:
  - Enable email confirmations in Supabase dashboard (Auth → Settings → Enable email confirmations)
  - Configure custom SMTP (recommended: SendGrid, AWS SES, or Resend) in Supabase dashboard for reliable delivery
  - Customize email templates in Supabase dashboard (branded registration confirmation, password reset emails)
  - Set `NEXT_PUBLIC_SITE_URL` to production URL (used in email redirect links)
- **Registration flow with confirmation enabled**:
  - User signs up → receives confirmation email → clicks link → redirected to `/auth/callback` → session created → redirected to onboarding
  - Until confirmed, user cannot log in (Supabase enforces this)
  - Signup page should show "Check your email" message after submission
- **Password reset flow** (already implemented):
  - User enters email on forgot-password page → Supabase sends reset link → user clicks link → `/auth/callback?next=/reset-password` → user sets new password

#### Google OAuth Details
- **Flow**: Client-side initiation via `supabase.auth.signInWithOAuth({ provider: 'google' })`. Uses Supabase's PKCE flow — redirects to Google consent screen, then back to `/auth/callback?code=...` for code exchange. Same callback route and proxy code exchange logic as email flows.
- **Account linking**: Supabase "Automatic user linking" enabled — if Google email matches an existing email/password account, identities are merged. No duplicate `public.users` rows.
- **New user flow**: `handle_new_user()` trigger fires on OAuth signup, creating `public.users` row with defaults (`role: 'user'`, `verification_status: 'unverified'`). User redirected to `/onboarding` (proxy enforces profile requirement).
- **UI**: "Continue with Google" button on both `/login` and `/signup` pages, above the email/password form with an "or" divider.
- **No backend changes**: No new migrations, no server action, no proxy/callback changes. Existing PKCE infrastructure handles OAuth identically to email flows.
- **Configuration**: Google OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) configured in Supabase dashboard (production) and `supabase/config.toml` via env vars (local dev).
- **Edge cases**: Cancelled consent → user stays on login page. Banned/suspended → proxy redirects to `/banned`. Self-deleted → proxy redirects to `/account-deleted`.

#### Google Profile Import (Onboarding)

When a user signs up via Google OAuth, Supabase stores their Google profile metadata in `auth.users.raw_user_meta_data` (fields: `full_name`, `avatar_url`, `picture`, `name`). This data should be used to pre-populate the onboarding form for a smoother experience.

**Behavior**:
- **Name pre-fill**: The `full_name` field on the onboarding form is pre-populated with the Google display name (from `user_metadata.full_name` or `user_metadata.name`). The field remains editable — user can change it.
- **Avatar pre-fill**: The Google profile picture URL (from `user_metadata.avatar_url` or `user_metadata.picture`) is shown as the photo preview on the onboarding form. If the user does not upload a custom photo, this URL is used as `profiles.photo_url`.
- **Custom photo takes priority**: If the user uploads a photo via the file input, it is uploaded to the `avatars` storage bucket as usual, and the Google avatar URL is ignored.
- **Remove option**: User can remove the pre-filled Google avatar (clear the preview), in which case no photo is set unless they upload one.
- **Email-password users**: No change — name field is blank, no photo preview. The feature only activates when Google metadata is present.

**Implementation approach**:
1. **`onboarding/page.tsx`** (Server Component): Read `user.user_metadata.full_name` and `user.user_metadata.avatar_url` from the authenticated Supabase user. Pass as `defaultName` and `googleAvatarUrl` props to `OnboardingForm`.
2. **`onboarding-form.tsx`** (Client Component): Accept new props. Set `defaultValue` on name input. Initialize photo preview with Google avatar URL. Include a hidden input `google_avatar_url` so the server action knows the fallback.
3. **`onboarding/actions.ts`** (Server Action): If no photo file is uploaded but `google_avatar_url` is present in form data, validate it's a Google-hosted URL (`lh3.googleusercontent.com` or similar) and use it as `photo_url`. No storage upload needed — Google URLs are publicly accessible.

**No schema changes**: `profiles.photo_url` already accepts any URL string. Google avatar URLs are stable, publicly accessible CDN links.

**Edge cases**:
- Google account without profile picture → no avatar pre-fill, behaves like email signup
- Google display name is empty or whitespace → no name pre-fill
- Google avatar URL is invalid/expired → profile created without photo (graceful degradation)
- User changes Google avatar after signup → `photo_url` still points to old URL (acceptable — user can update via profile edit)

### F2. Alumni Verification
- **Trigger**: user submits verification request with supporting info (graduation year, student ID, degree program)
- **Queue**: admins see pending requests in dashboard, can approve/reject with optional message
- **Status**: `unverified` → `pending` → `verified` or `rejected`
- **Rejected users**: can re-submit with updated info
- **Unverified access**: can browse directory (limited fields only), see the value of the platform, but cannot connect or message

### F3. Profile System

#### Required at signup (progressive — collect minimally, prompt for more later):
- Full name
- Graduation year
- One primary career field (from taxonomy)

#### Prompted after signup (onboarding quiz + progressive nudges):
- Profile photo
- Current job title & company
- Industry specialization (level 2 of taxonomy)
- Location (country → state/province → city)
- Education history
- Bio / "About me"

#### Career History (LinkedIn-style):
- Multiple entries, each with: job title, company, industry, specialization, start date, end date (or "Present"), description (optional)
- One entry marked as "current"
- Displayed as a timeline on the profile

#### Education History:
- Multiple entries: institution, degree, field of study, start year, end year
- School entry auto-populated from signup data

#### Availability Tags (checkboxes):
- Open to mentoring
- Open to coffee chats
- Hiring / looking for referrals
- Looking for work
- Open to collaboration
- Not currently available (hides from recommendations but profile still exists)

#### Visibility Controls (Phase 1 — Connected-only details):
- **Public to all verified alumni**: name, photo, graduation year, primary field, current job title
- **Visible only to connections**: email, phone, full career history, education details, location (city-level), bio
- **Phase 2 (future)**: per-field granular toggles

### F4. Industry Taxonomy (Two-Level)

**Level 1 — Industries** (~20):
Technology, Finance & Banking, Healthcare & Medicine, Education, Law, Engineering, Arts & Entertainment, Media & Communications, Government & Public Policy, Non-Profit, Consulting, Real Estate, Retail & E-commerce, Manufacturing, Energy & Environment, Agriculture, Transportation & Logistics, Hospitality & Tourism, Sports & Fitness, Research & Academia

**Level 2 — Specializations** (5-15 per industry, examples):
- Technology → Software Engineering, Data Science & AI/ML, Product Management, Cybersecurity, DevOps & Infrastructure, UX/UI Design, Mobile Development
- Finance → Investment Banking, Venture Capital, Financial Planning, Accounting, Fintech, Insurance
- Healthcare → Clinical Medicine, Nursing, Public Health, Pharmaceuticals, Biotech, Health Administration

Admin can add/edit/archive categories. Users select one primary + optional secondary field.

### F5. Alumni Directory & Search

#### Search bar:
- Full-text search across name, job title, company, bio
- Powered by Postgres `tsvector` / `ts_query` (Supabase)

#### Filters (combinable):
- Industry (level 1)
- Specialization (level 2)
- Graduation year (range)
- Location (country, state, city — hierarchical)
- Availability tags
- Currently employed at (company name)
- Degree type

#### Results:
- Card grid layout showing: photo, name, current title, company, field, location, grad year
- Pagination: cursor-based, 20 results per page
- Sort by: relevance (default), graduation year, name, recently active

### F6. Recommendation Engine

#### Rule-Based Scoring (Phase 1):
Each alumni pair gets a similarity score based on weighted factors:

| Factor | Weight | Logic |
|--------|--------|-------|
| Same specialization | +15 | Exact level-2 match |
| Same industry | +10 | Exact level-1 match |
| Same city | +8 | Exact match |
| Same state/province | +5 | If not same city |
| Same country | +3 | If not same state |
| Graduation year proximity | +5 to +1 | ±1 year = +5, ±2 = +4, ... ±5 = +1 |
| Same company (current) | +7 | Working at the same place |
| Availability match | +5 | Mentoring seeker ↔ mentor available |
| Mutual connections | +3 per | Social graph overlap |

#### Display:
- "Suggested Alumni" section on dashboard (top 10-20 scored profiles)
- "Alumni like you" carousel on profile pages
- Refreshed daily or on profile update

#### Cold-Start Strategy (new users with sparse profiles):
1. **Onboarding quiz** (immediately after signup): "What field are you in?", "What are you looking for?", "Where are you based?" — seeds the scoring
2. **Same-year classmates**: always available since graduation year is required
3. **Popular/active profiles**: most-connected or recently-active alumni as fallback

#### Phase 2 (future): Embedding-based similarity
- Encode profiles as vectors using pgvector
- Semantic matching: "Data Scientist" ≈ "ML Engineer"
- Hybrid: rule-based + vector similarity

### F7. Connection System
- **Send request**: with optional message ("Hi, I'd love to connect because...")
- **Receive request**: notification (in-app + email)
- **Actions**: accept, reject, or ignore
- **Connected state**: unlocks detailed profile view + messaging
- **Disconnect**: either party can remove connection at any time
- **Block**: prevents all future contact and hides from each other's search results

### F8. Real-Time Messaging
- **Powered by**: Supabase Realtime (WebSocket)
- **Access**: only between connected alumni
- **Features**:
  - 1-on-1 conversations
  - Message list with last message preview, unread count
  - Real-time typing indicators (stretch goal)
  - Read receipts (stretch goal)
  - Message timestamps
- **Rate limiting**:
  - New users (< 7 days verified): 10 messages/day, 5 new conversations/day
  - Established users: 50 messages/day, 20 new conversations/day
  - Rate limit warning shown before hitting cap
- **Moderation**:
  - "Report this message" button on each message
  - Reported messages go to moderator queue with context (full conversation)
  - Reporter stays anonymous to the reported user

### F9. Notifications

#### In-App:
- Bell icon in navbar with unread count badge
- Notification dropdown with recent items
- Full notification page for history
- Types: connection request, connection accepted, new message, profile view (stretch), group invite, admin announcement, verification status update

#### Email:
- Triggered by: new connection request, new message (if not read within 15 min), verification approved/rejected, weekly digest (optional)
- Unsubscribe link in every email
- Email service: Resend (free tier: 100 emails/day)
- User can configure email preferences (per notification type)

### F9b. Alumni World Map

Interactive geographic visualization of where alumni are located worldwide.

#### Access:
- **Verified users only** — unverified users redirected to `/directory`
- Aggregated counts only — no individual alumni identifiable from map data
- City-level data respects existing profile visibility rules (names not shown)

#### Map Technology:
- **Mapbox GL JS** via `react-map-gl` — vector tiles, smooth zoom/pan
- **Dark mode**: Mapbox light/dark style switching based on app theme
- **Env**: `NEXT_PUBLIC_MAPBOX_TOKEN` (public, restricted to domain in production)

#### Visual Design:
- **Country view**: Choropleth-style colored circles sized by alumni count (5 color buckets, light→dark blue)
- **Region/city view**: Bubble markers with count labels, radius proportional to `log(count)`
- **Transitions**: Smooth `flyTo` animations (1500ms) on drill-down, fade-in markers

#### Interaction:
- **Drill-down**: Country → State/Province → City (3 levels)
- **Click region**: Shows region stats in sidebar + "View in Directory" link (pre-filtered to that location)
- **Hover**: Tooltip with region name + alumni count
- **Zoom/pan**: Full Mapbox navigation controls + fullscreen

#### Filters (sidebar):
- Industry (level 1) + Specialization (level 2, dependent)
- Graduation year range (min/max)
- No name search (aggregated data only)
- URL state via `nuqs` for bookmarkable filtered views

#### Layout:
- **Desktop**: Full-width map + collapsible sidebar (320px, left side)
- **Mobile (<768px)**: Full-width map + bottom sheet (triggered by floating button)
- **Sidebar contents**: Overview stats (total alumni, total countries), breadcrumb navigation, filters, selected region stats card

#### Geocoding (Hybrid strategy):
- **Country level**: Static JSON lookup (~200 country name→centroid mappings) — no API needed
- **City/state level**: Nominatim geocoding on profile save — stores `latitude`, `longitude`, `location_geocoded_at` in profiles table
- **Integration**: Fire-and-forget geocoding in `updateProfile` and `completeOnboardingQuiz` server actions
- **Backfill**: `scripts/backfill-geocoding.ts` for existing profiles (Nominatim, 1 req/sec)

#### Admin Map (`/admin/map`):
- **Toggle**: "Include unverified users" switch (shows verified + unverified counts per country)
- **Trend data**: Monthly new-user counts per country (last 6 months)
- **Stats**: Verified vs unverified breakdown in sidebar
- Reuses same `MapView`, `MapSidebar`, `MapFilters` components from user map

#### Database:
- **Migration 00023**: Adds `latitude`, `longitude`, `location_geocoded_at` to profiles. Partial index on `(latitude, longitude) WHERE latitude IS NOT NULL`.
- **Migration 00024**: 5 RPC functions (`SECURITY DEFINER`):
  - `get_map_country_counts(p_filters)` — verified users by country
  - `get_map_region_counts(p_country, p_filters)` — states within country
  - `get_map_city_counts(p_country, p_state, p_filters)` — cities within state
  - `get_map_country_counts_admin(p_include_unverified, p_filters)` — admin with verified/unverified split
  - `get_map_trend_data(p_country, p_months)` — admin monthly growth

#### Navigation:
- Main navbar: Dashboard → Directory → **Map** → Connections → Messages → Groups → Verification
- Admin navbar: Verification → Users → Taxonomy → Analytics → **Map** → Back to App

### F10. Groups (Basic — Admin-Created)

- **Creation**: admins create groups with name, description, type (year-based, field-based, location-based, custom)
- **Membership**: verified alumni can browse and join groups
- **Group page**: member list with search/filter, group description
- **No group chat** in Phase 1 — just a member directory within the group
- **Auto-groups** (stretch): system auto-creates groups for each graduation year and each industry

#### Phase 2 (future): Full Community Groups
- User-created groups
- Group discussion boards / group chat
- Group events
- Group moderation

### F11. Admin Dashboard

#### Verification Queue:
- List of pending verification requests
- View submitted info (name, grad year, student ID, degree)
- Approve / reject with optional message to user
- Bulk approve (select multiple)

#### User Management:
- Searchable user list with filters (role, status, verification)
- View any user's full profile
- Actions: verify, ban (permanent), suspend (temporary with duration), promote to moderator, demote, delete account
- Action audit log (who did what, when)

#### Taxonomy Management:
- CRUD for industries and specializations
- Archive (soft-delete) categories that are no longer relevant
- See how many users are tagged with each category

#### Bulk Invite:
- Upload CSV with columns: email, name (optional), graduation year (optional)
- System sends invite emails with signup link
- Track: invited, signed up, verified

#### Announcements:
- Create platform-wide notices (title, body, optional link)
- Display as banner on main app or in notification feed
- Can be dismissed by users
- Schedule for future publication (stretch)

#### Analytics:
- Total users (by status: unverified, pending, verified)
- Signups over time (chart)
- Active users (daily/weekly/monthly)
- Connections made over time
- Messages sent over time
- Most popular industries/specializations
- Top locations

### F12. Moderator Dashboard

#### Report Queue:
- List of reported messages with status (pending, reviewed, actioned)
- View full conversation context
- Actions: dismiss report, warn user, mute user (1 day, 7 days, 30 days)
- Escalate to admin (for ban-worthy offenses)

#### Limited User Actions:
- Can warn users (sends notification)
- Can mute users (prevents messaging for duration)
- Cannot ban, suspend, delete, or modify user roles
- Cannot access analytics, taxonomy, or bulk invite

### F13. Account Management

#### Profile Update Prompts:
- In-app banner: "Your profile was last updated X months ago. Is it still accurate?"
- Email nudge every 6 months (configurable by admin)
- Quick-update flow: confirm or update key fields (job, location, availability)

#### Account Deletion:
1. User requests deletion from settings
2. Data export generated (JSON): profile, connections, messages, groups
3. Account soft-deleted: hidden from search, connections removed, messages anonymized ("Deleted User")
4. 30-day grace period: user can cancel and reactivate
5. After 30 days: hard delete of all personal data from database
6. Confirmation email at each step

---

## Non-Functional Requirements

### Performance
- **Core Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- **Bundle size**: Target < 200KB initial JavaScript bundle
- **API response**: Server Actions < 500ms p95
- **Recharts lazy-loading** (P5, done 2026-03-14): Analytics dashboard dynamically imported — ~130KB removed from non-admin bundles
- **Supabase client singleton** (P8, done 2026-03-14): Browser client cached at module level — WebSocket connections reduced from 3-4 to 1
- **Missing database indexes** (P9, done 2026-03-14): 4 indexes for notifications, reports, announcements, warnings
- **Proxy query reduction** (P4, done 2026-03-14): Combined user status + profile existence into single nested select — 2 queries → 1 per request
- **Cached taxonomy data** (P6, done 2026-03-14): School, industries, specializations, and availability tag types cached via `unstable_cache` + service client — eliminates repeated DB queries for shared data (1h revalidation)
- **Dashboard parallelization** (P3, done 2026-03-14): Profile, recommendations, and popular alumni fetched in parallel — cold-start detection moved into RPC, eliminating ~200-400ms sequential wait
- **Query consolidation** (P2, done 2026-03-14): Directory uses PostgREST nested select for career + tags inline; recommendation RPCs include career/tags via LEFT JOIN LATERAL — dashboard 8→4 queries, directory 3→1
- **Message unread N+1** (P0, done 2026-03-14): Single `get_unread_counts` RPC replaces N per-conversation queries — biggest single improvement
- **Conversations RPC** (P10, done 2026-03-14): Single `get_user_conversations` RPC replaces 4+ sequential queries for conversation list
- **Profile page parallelization** (P7, done 2026-03-14): Visibility tier and relationship fetched in parallel — saves ~100-200ms per profile view
- **Image optimization** (P1, done 2026-03-14): All `<img>` tags replaced with `next/image` `<Image>` — auto lazy-loading, WebP conversion, responsive srcSet. Message attachments kept as raw `<img>` (signed URLs)
- **Performance plan**: See `docs/PERFORMANCE_PLAN.md` for full optimization roadmap (P0–P10)

### Accessibility
- **WCAG 2.1 AA** compliance
- Keyboard-navigable for all core flows
- Screen reader compatible

### SEO (F43)

Since most app content is behind authentication, SEO focuses on making the **public-facing pages** discoverable and shareable. The goal is to help alumni find the platform via Google when searching for their school's alumni network.

#### 1. `robots.txt` (Next.js convention file: `src/app/robots.ts`)
- Allow crawling of public pages: `/`, `/login`, `/signup`
- Disallow crawling of authenticated app routes: `/dashboard`, `/directory`, `/messages`, `/connections`, `/groups`, `/settings`, `/admin`, `/moderation`, `/onboarding`, `/verification`, `/reset-password`, `/account-deleted`, `/banned`
- Disallow crawling of API/auth routes: `/api/*`, `/auth/*`
- Reference the sitemap URL: `https://ptnkalum.com/sitemap.xml`

#### 2. `sitemap.xml` (Next.js convention file: `src/app/sitemap.ts`)
- Static entries only (no dynamic/authenticated content):
  - `/` — landing page (priority 1.0, changeFrequency: monthly)
  - `/login` — login page (priority 0.5, changeFrequency: yearly)
  - `/signup` — signup page (priority 0.8, changeFrequency: yearly)
- `lastModified` set to build date or hardcoded date
- Base URL from `NEXT_PUBLIC_SITE_URL` env var (fallback: `https://ptnkalum.com`)

#### 3. Per-Page Metadata (Next.js `metadata` export)
- **Root layout** (`src/app/layout.tsx`):
  - `metadataBase`: `new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://ptnkalum.com')`
  - `title.template`: `"%s | PTNKAlum"` (allows per-page titles)
  - `title.default`: `"PTNKAlum — Alumni Network"`
  - `description`: school-specific, keyword-rich (e.g., "Connect with PTNK alumni worldwide. Search by career, location, and graduation year.")
  - `openGraph`: type `website`, locale `vi_VN`, siteName `PTNKAlum`, default image (OG image)
  - `twitter`: card `summary_large_image`, default image
  - `robots.index`: true (default), individual pages override as needed
- **Login page**: title "Log In", `robots: { index: false }` (no indexing auth pages)
- **Signup page**: title "Sign Up", `robots: { index: false }`
- **Landing page** (`/`): title "PTNKAlum — PTNK Alumni Network", full description with keywords
- **All authenticated pages**: `robots: { index: false, follow: false }` (prevent indexing if crawlers reach them)

#### 4. Open Graph Image
- Static OG image at `src/app/opengraph-image.png` (or `.jpg`)
  - Dimensions: 1200×630px
  - Content: school logo/name + "Alumni Network" + tagline
  - Used as default when pages are shared on social media
- Alt text: "PTNKAlum — PTNK Alumni Network"

#### 5. JSON-LD Structured Data (on landing page)
- `Organization` schema on the landing page (`/`):
  ```json
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "PTNKAlum",
    "url": "https://ptnkalum.com",
    "description": "Alumni network for PTNK graduates",
    "logo": "https://ptnkalum.com/logo.png"
  }
  ```
- Rendered as `<script type="application/ld+json">` in the page component
- `WebSite` schema with `potentialAction` for site search (optional, only if public search exists)

#### 6. Technical SEO Checklist
- Canonical URLs via `metadataBase` (Next.js auto-generates `<link rel="canonical">`)
- `lang` attribute on `<html>` (already set via `next-intl`)
- No duplicate content issues (authenticated routes disallowed in robots.txt)
- Fast page loads (LCP < 2.5s on landing page — already optimized)
- Mobile-friendly (already responsive)

#### Implementation Notes
- All SEO files use **Next.js App Router convention files** (`robots.ts`, `sitemap.ts`, `opengraph-image.png`) — no manual route handlers needed
- No schema changes or migrations required
- No new dependencies
- OG image can be a static file or generated with `next/og` (ImageResponse) — static preferred for simplicity
- Google Search Console verification via DNS TXT record in Cloudflare (manual step, not code)

### i18n Readiness
- English only for Phase 1
- Extract user-facing strings to constants (cheap now, expensive to retrofit later)

### Visual Theme (F44)

App-wide color palette: **indigo + warm amber accent** (see [ADR-024](docs/adrs/024-indigo-warm-accent-theme.md)).

- **Primary color**: indigo (`oklch(0.65 0.16 270)` light, `oklch(0.78 0.12 270)` dark)
- **Accent color**: warm amber (`oklch(0.94 0.04 75)` light, `oklch(0.32 0.04 75)` dark)
- **Color space**: oklch throughout for perceptual uniformity
- **Scope**: All CSS custom properties (light + dark + sidebar + charts), landing page, auth layout, 23 component files
- **Custom utilities**: `.landing-gradient-text` (indigo → amber gradient), `.glass-card` (glassmorphism)
- Full implementation notes: [docs/features/visual-refresh-indigo-theme.md](docs/features/visual-refresh-indigo-theme.md)

### Post-Launch Hardening (Phase 2)

Identified during pre-deploy architecture audit ([ADR-019](docs/adrs/019-pre-deploy-security-hardening.md)). These items were assessed as acceptable risk for soft launch (<100 users) but should be addressed before scaling:

- **Redis-based rate limiting**: Replace DB-query rate limiting in messaging with atomic Redis counters. Current approach has a race condition window where two rapid requests can both pass the check.
- **Security headers**: Add CSP, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy via `next.config.ts` `headers()`. Important for XSS protection with user-generated content.
- **Storage cleanup job**: Soft-deleted message attachments remain in Supabase Storage indefinitely. Add a scheduled function to purge files where `is_deleted = true` and `deleted_at` is older than 30 days.
- ~~**Missing database indexes**: `notifications(user_id, is_read)` for bulk mark-all-read, `message_reports(reporter_id)`, `dismissed_announcements(user_id)`, `user_warnings(moderator_id)`.~~ **Done** (2026-03-14, migration `00033`).
- **Message soft-delete at RLS level**: Currently `messages.is_deleted` is filtered by app code only. Add RLS policy `WHERE is_deleted = false` so direct API queries also respect deletion.
- **Mute enforcement at RLS level**: Currently checked in `sendMessage()` server action only. Add a trigger or RLS check on `messages` INSERT to enforce at DB level.
- **Unit test fixes**: 10 failing tests (4 in profile-completeness scoring, 6 in onboarding actions). Mocks need updating after schema changes.
- **Unread count query optimization**: Current implementation runs N queries for N conversations (O(n)). Replace with a single batch RPC using `GROUP BY conversation_id`.
- **E2E test suite**: Playwright is configured but has zero test files. Critical paths to cover: signup → onboarding → verification, connection → messaging, admin approve/reject, moderator warn/mute.

---

## UI/UX Guidelines

### Layout
- **Responsive**: mobile-first design, breakpoints at sm(640), md(768), lg(1024), xl(1280)
- **Navigation**: top navbar (logo, search, notifications bell, profile avatar, admin link if applicable)
- **Sidebar** (desktop only): quick filters, groups, connections
- **Main content area**: search results / feed / profile / messaging

### Key Pages
1. **Landing / Marketing page** — for logged-out users
2. **Signup → Onboarding quiz** — progressive profile creation
3. **Dashboard / Home** — recommended alumni, recent activity, announcements
4. **Directory** — search + filter + results grid
5. **Profile page** — public view (for others) and edit view (for self)
6. **Connections** — pending requests, connected alumni list
7. **Messages** — conversation list + active chat
8. **Groups** — browse, join, view members
9. **Settings** — profile, privacy, notifications, account deletion
10. **Admin Dashboard** — verification, users, analytics, taxonomy, invites, announcements
11. **Moderator Dashboard** — report queue, moderation actions

### Design Principles
- Clean, professional aesthetic (not social-media-flashy)
- Consistent card-based layouts for alumni listings
- Skeleton loading states for all async content
- Empty states with helpful CTAs ("No connections yet? Start by searching for classmates")
- Toast notifications for actions (connected, message sent, etc.)
- Dark mode support (via Tailwind `dark:` classes)

---

## Future Scaling Path

These features are designed into the architecture but not built in Phase 1:

| Feature | Phase | Prerequisites |
|---------|-------|---------------|
| Granular per-field privacy controls | 2 | Connected-only details working |
| Embedding-based recommendations (pgvector) | 2 | Rule-based engine, sufficient user data |
| Full community groups (user-created, discussion boards) | 2 | Basic groups working |
| OAuth login (Google — done, LinkedIn — deferred) | 2 | Email auth working |
| LinkedIn profile import | 2 | Career history data model |
| Native mobile apps (React Native) | 3 | Responsive web stable |
| Push notifications | 3 | Email + in-app notifications working |
| Events system (alumni meetups) | 3 | Groups working |
| Mentorship matching program | 3 | Availability tags + connections |
| Job board | 3 | Career history + availability tags |
| Dedicated search engine (Algolia/Meilisearch) | 3 | >10K users, Postgres search insufficient |
| Multi-school support / multi-tenancy | 4 | Entire platform stable |

### Budget & Infrastructure Scaling

| Stage | Users | Infra | Cost |
|-------|-------|-------|------|
| Launch | 0-500 | Vercel Free + Supabase Free + Resend Free | $0/mo |
| Growth | 500-5K | Vercel Pro + Supabase Pro + Resend Pro | ~$45/mo |
| Scale | 5K+ | Evaluate dedicated hosting, CDN, search | ~$100+/mo |
