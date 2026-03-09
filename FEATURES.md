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
- **OAuth** (future): Google, LinkedIn
- **Session management**: JWT-based via Supabase, auto-refresh
- After signup, user lands on onboarding flow (not the main app)

#### Server-Side Auth Details
- **`public.users` table**: A companion table to Supabase's `auth.users`. Stores app-specific fields (`role`, `verification_status`, `is_active`, `deleted_at`). Linked via `id` referencing `auth.users.id` with `on delete cascade`.
- **Auto-creation trigger**: A Postgres trigger (`on_auth_user_created`) fires after every `auth.users` insert and creates the corresponding `public.users` row with defaults (`role: 'user'`, `verification_status: 'unverified'`, `is_active: true`).
- **`updated_at` trigger**: A Postgres trigger (`on_users_updated`) automatically sets `updated_at = now()` on every `public.users` update. This pattern is reused for all tables with `updated_at`.
- **Email confirmation**: Disabled in development (Supabase default for local dev). In production, Supabase's email confirmation can be enabled via the dashboard — the signup flow already handles the case where `data.user` may not have a confirmed session.
- **Password reset flow**: Uses Supabase's `resetPasswordForEmail()` which sends a magic link. The link redirects to `/auth/callback?next=/reset-password` where a route handler exchanges the code for a session. The reset password response always returns success to prevent email enumeration.
- **Auth callback route** (`/auth/callback`): Handles code exchange for all Supabase email flows (password reset, email verification). Redirects to the `next` query param on success, or `/login` on failure.
- **Middleware session refresh**: The Next.js middleware calls `supabase.auth.getUser()` on every request. This is mandatory — it refreshes the JWT token and ensures Server Components receive a valid session.
- **RLS dependency**: All RLS policies on `public.users` (and future tables) use `auth.uid()` to identify the current user. The middleware's session refresh ensures `auth.uid()` is always current.
- **Validation**: All auth Server Actions validate input with Zod before calling Supabase. The signup action validates email format, password min length (8 chars), and password confirmation match. Login validates email format and password presence.
- **Error handling**: Auth Server Actions return `ActionResult<T>`. Supabase errors are logged server-side with structured format (`[ServerAction:actionName]`) and sanitized before returning to the client. Specific errors (e.g., "already registered") are mapped to user-friendly messages.

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

### Accessibility
- **WCAG 2.1 AA** compliance
- Keyboard-navigable for all core flows
- Screen reader compatible

### SEO
- Meta tags (`title`, `description`, `og:*`) on all public pages
- `robots.txt` and `sitemap.xml` for public pages
- Auth pages excluded from indexing (`noindex`)

### i18n Readiness
- English only for Phase 1
- Extract user-facing strings to constants (cheap now, expensive to retrofit later)

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
| OAuth login (Google, LinkedIn) | 2 | Email auth working |
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
