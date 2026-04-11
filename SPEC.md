# AlumNet — Product Specification

> Alumni network platform for connecting school graduates by career field, education, location, and shared interests.
> Single-school deployment. Next.js + Supabase + shadcn/ui + Tailwind CSS.

---

## Table of Contents

1. [Feature Log](#feature-log)
2. [Data Model](#data-model)
3. [Technical Architecture](#technical-architecture)
4. [Feature Dependency Graph](#feature-dependency-graph)

> For detailed functional requirements (F1–F13), see `FEATURES.md`.
> For implementation strategy and build order, see `PLAN.md`.

---

## Feature Log

> **This section tracks implementation progress.** Update status after each feature is completed. Each session should check this section first to know where we left off.


| #     | Feature                                              | Status | Notes                                                                                                                                                                                                                                                                                                                                                                                         |
| ----- | ---------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Project scaffolding (Next.js + Supabase + shadcn/ui) | `DONE` | 2026-03-08                                                                                                                                                                                                                                                                                                                                                                                    |
| 2     | Auth: signup, login, logout                          | `DONE` | 2026-03-08. Supabase Auth + public.users table + proxy + forgot password                                                                                                                                                                                                                                                                                                                      |
| 3     | Alumni verification workflow                         | `DONE` | 2026-03-09. Verification request form + admin queue with sheet detail panel + approve/reject/bulk approve + status banner.                                                                                                                                                                                                                                                                    |
| 3a    | Verification: document upload (transcripts, diploma) | `DONE` | 2026-03-09. Private storage bucket + verification_documents table. Up to 4 files (2MB each, PDF/JPEG/PNG/WebP). Admin sees docs with signed URLs in review sheet.                                                                                                                                                                                                                             |
| 3b    | Schools table + school-aware validation              | `DONE` | 2026-03-09. `schools` table with PTNK seed, `school_id` FK on profiles/verification_requests, dynamic graduation year validation (1999–current+3), renamed `degree_program` → `specialization_name`.                                                                                                                                                                                          |
| 4     | Profile: create & edit (progressive)                 | `DONE` | 2026-03-09. Profiles table + RLS + avatars bucket + onboarding flow + edit page + completeness tracking.                                                                                                                                                                                                                                                                                      |
| 5     | Profile: career history (LinkedIn-style)             | `DONE` | 2026-03-09. career_entries table + RLS + CRUD actions + inline add/edit/delete forms + timeline display on profile view.                                                                                                                                                                                                                                                                      |
| 6     | Profile: education history                           | `DONE` | 2026-03-09. education_entries table + RLS + CRUD actions + inline add/edit/delete forms + display on profile view.                                                                                                                                                                                                                                                                            |
| 7     | Profile: location (region/country/state/city)        | `DONE` | 2026-03-09. Free-text inputs (country/state/city) already functional. Hierarchical dropdown upgrade deferred to Phase 2.                                                                                                                                                                                                                                                                      |
| 8     | Profile: availability tags                           | `DONE` | 2026-03-09. availability_tag_types + user_availability_tags junction table + RLS + checkbox UI + badge display on profile view.                                                                                                                                                                                                                                                               |
| 9     | Profile: visibility controls                         | `DONE` | 2026-03-09. 3-tier visibility (unverified/verified/connected). `profile_contact_details` table with RLS. `is_connected_to()` reusable Postgres function. App-layer filtering for directory.                                                                                                                                                                                                   |
| 10    | Industry taxonomy (two-level)                        | `DONE` | 2026-03-09. Schema + RLS + seed (20 industries, 132 specializations) + query helpers. No UI yet.                                                                                                                                                                                                                                                                                              |
| 11    | Alumni directory: search + filters                   | `DONE` | 2026-03-09. Full-text search (tsvector), combinable filters (industry, specialization, grad year range, country, city), sort (name, grad year, recently active), nuqs URL state.                                                                                                                                                                                                              |
| 12    | Alumni directory: pagination                         | `DONE` | 2026-03-09. Offset-based pagination (20/page), smart page number display with ellipsis. Cursor-based deferred to Phase 3 (100k+ scale).                                                                                                                                                                                                                                                       |
| 13    | Recommendation engine (rule-based scoring)           | `DONE` | 2026-03-10. Postgres function `get_recommended_alumni()` with weighted scoring (specialization +15, industry +10, location +8/5/3, grad year +5→+1, company +7, availability +5, mutual connections +3). Dashboard UI with grid/list toggle, staggered animations, match badges, profile completeness nudge. Fallback to recently active alumni for cold-start.                               |
| 14    | Cold-start: onboarding quiz                          | `DONE` | 2026-03-10. 3-step post-signup quiz (location, availability tags, bio+job). Writes to existing profile fields. Skippable. Redirects from onboarding → quiz → dashboard.                                                                                                                                                                                                                       |
| 15    | Cold-start: same-year classmates                     | `DONE` | 2026-03-10. Blended into recommendation engine via `p_is_cold_start` param. Exact grad year match boosted from +5 to +20 for cold-start users (profile_completeness < 40).                                                                                                                                                                                                                    |
| 16    | Cold-start: popular/active profiles                  | `DONE` | 2026-03-10. `profile_views` table with daily dedup. `get_popular_alumni()` function: composite score (views 30d + connections*3 + recency bonus). "Trending Alumni" dashboard section. View tracking on profile pages.                                                                                                                                                                        |
| 17    | Connection system: send/accept/reject requests       | `DONE` | 2026-03-09. connections + blocks tables, RLS, 6 server actions, connections page with tabs, profile action buttons, directory status dots, navbar badge.                                                                                                                                                                                                                                      |
| 18    | Real-time messaging (WebSocket)                      | `DONE` | 2026-03-10. Supabase Realtime. conversations + messages tables, optimistic UI, 5-min timestamp grouping, tap-to-toggle timestamps.                                                                                                                                                                                                                                                            |
| 19    | Message rate limiting                                | `DONE` | 2026-03-10. Tier-based: 20/day (new), 500/day (established), unlimited (admin). 5 new convos/day (new), 20/day (established).                                                                                                                                                                                                                                                                 |
| 20    | Message reporting                                    | `DONE` | 2026-03-10. Anonymous reports to moderator queue. UNIQUE(message_id, reporter_id). Status workflow: pending → reviewed → action_taken/dismissed.                                                                                                                                                                                                                                              |
| 21    | Notifications: in-app                                | `DONE` | 2026-03-10. notifications table + RLS + SECURITY DEFINER insert + Realtime. Bell icon with popover dropdown, /notifications page with pagination, mark read/delete. Triggers on connection request/accept, new message, verification approve/reject.                                                                                                                                          |
| 22    | Notifications: email                                 | `DONE` | 2026-03-10. Resend integration. Templates for connection request/accepted, new message, verification update. `notification_preferences` table with per-type email opt-out. One-click unsubscribe. Settings page at `/settings/notifications`. Graceful skip if no API key.                                                                                                                    |
| 23    | Groups: basic (admin-created)                        | `DONE` | 2026-03-10. `groups` + `group_members` tables. Admin CRUD (create/update/soft-delete). Verified users browse/join/leave. Type enum (year_based, field_based, location_based, custom). Browse page with search + type filter + pagination. Group detail page with member directory. Future-ready: `role` column on members (member/moderator/owner), `cover_image_url`, `max_members` columns. |
| 24    | Admin dashboard: verification queue                  | `DONE` | 2026-03-10. Admin hub page with stats cards. Verification queue was already functional from F3a.                                                                                                                                                                                                                                                                                              |
| 25    | Admin dashboard: user management                     | `DONE` | 2026-03-10. Searchable user list with role/status/active filters, pagination. User detail sheet with contextual actions (verify, ban/unban, suspend/unsuspend, promote/demote, delete). `admin_audit_log` table with timeline display. Ban/suspension enforcement in proxy → `/banned` page.                                                                                                  |
| 26    | Admin dashboard: analytics                           | `DONE` | 2026-03-10. shadcn/ui Charts (Recharts). 6 Postgres RPC functions. Stat cards (total/verified/pending/unverified, DAU/WAU/MAU). Area chart (signups), donut (status), line (connections+messages), horizontal bars (industries, locations). Empty states, loading skeletons.                                                                                                                  |
| 27    | Admin dashboard: taxonomy management                 | `DONE` | 2026-03-10. CRUD for industries & specializations. Expandable rows, search, archive/restore (cascade), user counts, audit logging.                                                                                                                                                                                                                                                            |
| 28    | Alumni world map                                     | `DONE` | 2026-03-10. Interactive Mapbox GL map with country→state→city drill-down. Choropleth + bubble markers. Hybrid geocoding (static country lookup + Nominatim on profile save). Filters (industry, specialization, grad year). Full-width map + collapsible sidebar. Admin variant with unverified toggle + trend data. Backfill script for existing profiles.                                   |
| 29    | Admin dashboard: bulk invite                         | `DONE` | 2026-03-10. CSV upload (max 500 rows), email validation, duplicate detection, invite emails via Resend, status tracking (invited→signed_up→verified), invite history with resend.                                                                                                                                                                                                             |
| 40    | Message attachments (media & file sharing)           | `DONE` | 2026-03-10. `message_attachments` table + `message-attachments` storage bucket. Images (JPEG/PNG/WebP/GIF) + docs (PDF/DOCX/XLSX/PPTX/TXT/CSV). 5MB/file, 5 files/msg, 25MB/user quota. Inline image previews, lightbox, document download cards. Media panel (All/Media/Files tabs). Drag-and-drop + paperclip button. Optimistic UI. Signed URLs with onError re-fetch.                     |
| 30    | Admin dashboard: announcements                       | `DONE` | 2026-03-11. `announcements` + `dismissed_announcements` tables. Admin CRUD (create/edit/toggle/delete). Dismissible banner on main app layout. Notification broadcast to all verified users on publish. Announcement email template. Audit logging.                                                                                                                                           |
| 31    | Moderator role: report queue                         | `DONE` | 2026-03-11. `/moderation/reports` page with filterable queue (pending/escalated/actioned/dismissed). Report detail sheet with conversation context, prior warnings. Moderator navbar (Reports only) + admin sees all links. `is_moderator()` helper function. RLS policy for moderator message access.                                                                                        |
| 32    | Moderator role: limited user actions                 | `DONE` | 2026-03-11. Warn (notification + email + persistent record), mute (1d/7d/30d via SECURITY DEFINER), unmute (early release), escalate to admin, dismiss. `user_warnings` table. `muted_until`/`muted_reason` columns on users. Mute enforcement in sendMessage() + disabled input UI. Mute banner on messages page. Audit logging for all moderator actions.                                   |
| 33    | Account: soft delete + data export                   | `DONE` | 2026-03-11. Self-service deletion from /settings/account. Password confirmation, 30-day grace period, /account-deleted reactivation page. JSON data export. pg_cron hard-delete daily. Audit log. Phase 2: Edge Function for storage cleanup + 7-day reminder email.                                                                                                                          |
| 34    | Profile staleness: periodic update prompts           | `DONE` | 2026-03-11. `app_settings` table (admin-configurable threshold, default 6mo). In-app amber banner with snooze/confirm/update. Quick-update page. pg_cron daily email nudge. Admin settings page. `profile_staleness` notification preference.                                                                                                                                                 |
| 35    | Responsive design (mobile-first)                     | `DONE` | 2026-03-11. All pages audited & fixed for 375px–1280px. Message bubbles, media panel, admin tables (card layout on mobile), admin navbar hamburger menu, map mobile filters (always-mounted bottom sheet), profile/dashboard/groups/notifications stacking, analytics chart widths.                                                                                                           |
| 35a   | Navigation: main navbar + admin navbar               | `DONE` | 2026-03-09. Separate navbars for main app and admin. Mobile hamburger menu. User dropdown with profile/logout.                                                                                                                                                                                                                                                                                |
| 35b   | Accessibility: aria-describedby + banner roles       | `DONE` | 2026-03-09. All form error messages linked via aria-describedby. Verification banners have role="status"/"alert".                                                                                                                                                                                                                                                                             |
| 35c-1 | Security: role escalation RLS                        | `DONE` | 2026-03-11. `users_update_own` RLS WITH CHECK to prevent self-modification of `role` and `verification_status`. See ADR-019.                                                                                                                                                                                                                                                                  |
| 35c-2 | Security: block bypass in sendMessage                | `DONE` | 2026-03-11. Add block check in `sendMessage()` — currently only checked in `getOrCreateConversation()`.                                                                                                                                                                                                                                                                                       |
| 35c-3 | Security: analytics RPC auth                         | `DONE` | 2026-03-11. Add `is_admin()` guard to 6 analytics functions (converted from SQL to plpgsql for IF/RAISE).                                                                                                                                                                                                                                                                                     |
| 35c-4 | Security: proxy fail-closed                          | `DONE` | 2026-03-11. Redirect to `/login` when Supabase status query errors, instead of silently continuing.                                                                                                                                                                                                                                                                                           |
| 35c-5 | Reliability: duplicate conversation prevention       | `DONE` | 2026-03-11. `user_pair` column + unique index on `conversations`. Backfill existing rows.                                                                                                                                                                                                                                                                                                     |
| 35c-6 | Reliability: real-time subscription gap fill         | `DONE` | 2026-03-11. Fetch missed messages after subscription reaches SUBSCRIBED status, dedup by ID.                                                                                                                                                                                                                                                                                                  |
| 35c-7 | Security: conversation participant RLS               | `DONE` | 2026-03-11. `create_conversation_with_participant()` SECURITY DEFINER function. Drop direct INSERT policy on `conversation_participants`.                                                                                                                                                                                                                                                     |
| 35c-8 | Security: signup email enumeration                   | `DONE` | 2026-03-11. Return generic success on duplicate email signup instead of revealing account exists.                                                                                                                                                                                                                                                                                             |
| 36    | Deployment: Vercel + Supabase                        | `DONE` | 2026-03-13. Email confirmation redirect fixed. Password reset flow works (code exchange + session). Reset password page complete.                                                                                                                                                                                                                                                             |
| 36a   | Reset password page                                  | `DONE` | 2026-03-13. `/reset-password` page with new password form. `updatePassword` server action. Proxy excludes `/reset-password` from profile check.                                                                                                                                                                                                                                               |
| 37    | i18n: user-selectable display language               | `DONE` | 2026-03-13. `next-intl` (non-routing, cookie-based). 20 namespaces, 230+ strings in en.json + vi.json. `preferred_language` column on users. `/settings/language` page. Synced on login. DB taxonomy data (industries, tags) not yet translated.                                                                                                                                              |
| 41    | Auth: Google OAuth (Sign in with Google)             | `DONE` | 2026-03-13. Client-side OAuth via Supabase. Auto-links by email. Same verification flow as email users.                                                                                                                                                                                                                                                                                       |
| 42    | Onboarding: Google profile import (name + avatar)    | `DONE` | 2026-03-13. Pre-populate onboarding form with Google name and avatar. User can still change both. No schema changes.                                                                                                                                                                                                                                                                          |
| P5    | Perf: lazy-load Recharts                             | `DONE` | 2026-03-14. Dynamic import of analytics dashboard via `next/dynamic`. ~130KB removed from non-admin bundles. Skeleton loading state.                                                                                                                                                                                                                                                          |
| P8    | Perf: Supabase browser client singleton              | `DONE` | 2026-03-14. Module-level singleton in `src/lib/supabase/client.ts`. Reduces WebSocket connections from 3-4 to 1.                                                                                                                                                                                                                                                                              |
| P9    | Perf: missing database indexes                       | `DONE` | 2026-03-14. 4 indexes: `notifications(user_id, is_read)`, `message_reports(reporter_id)`, `dismissed_announcements(user_id)`, `user_warnings(moderator_id)`.                                                                                                                                                                                                                                  |
| P4    | Perf: proxy query reduction                          | `DONE` | 2026-03-14. Combined user status + profile existence into single PostgREST nested select. 2 queries → 1 per authenticated request.                                                                                                                                                                                                                                                            |
| 43    | SEO: robots.txt, sitemap, metadata, structured data  | `DONE` | 2026-04-05. `robots.ts` (allow public, disallow auth routes), `sitemap.ts` (3 static entries), root layout `metadataBase` + OG/Twitter cards, landing page `metadata` + JSON-LD `Organization` schema. **2026-04-07**: discovered during F46 that the proxy matcher was intercepting `/sitemap.xml` and redirecting Googlebot to `/login` (reported as "Sitemap is HTML" in Search Console). Fixed in commit `aa37827` by excluding `robots.txt` and `sitemap.xml` from the proxy matcher. |
| 46    | SEO phase 2: About/FAQ pages + bilingual metadata    | `DONE` | 2026-04-07. Brand unification AlumNet→PTNKAlum across translations. New public pages `/about` and `/faq` with BreadcrumbList + FAQPage JSON-LD. Dynamic OG image via `next/og` (indigo gradient, bilingual tagline). Enriched root metadata with Vietnamese keywords, hreflang alternates, Google verification meta, WebSite + enriched Organization schema (parent org = school, contact point). Route group layouts (`(auth)`, `(main)`, `(admin)`) now export `robots: { index: false, follow: false }`. Shared `<PublicFooter>` component wires /about and /faq discoverability from the landing page. Follow-up: set up `contact@ptnkalum.com` inbound routing. ADR-026. |
| 44    | Visual refresh: indigo + warm accent theme           | `DONE` | 2026-04-05. Full palette overhaul from neutral gray to indigo (hue 270) + warm amber (hue 75). Updated all CSS custom properties (light + dark), landing page feature card colors, gradient text, auth layout decorative orbs, glassmorphism utility. 23 component files updated for consistency.                                                                                              |
| 45    | Last seen online (privacy-gated)                     | `DONE` | 2026-04-07. Migration `00038`: `profiles.show_last_active` + `touch_last_seen()` (throttled UPDATE), `can_see_last_seen()` (gate), `get_last_seen()` (display). Proxy fires touch RPC fire-and-forget. `<PresenceAnnouncer>` mounted in `notifications-wrapper.tsx` joins `user-presence:${userId}`. `<LastSeenIndicator>` rendered in profile header (server-prefetch) and chat header (client-fetch via RPC). Gate: connection + both-sent-≥1-message + `show_last_active`. Failure indistinguishable from "never online". `/settings/privacy` page exposes the toggle. ADR-025, docs/features/last-seen-online.md. |
| 45a   | F45 gate test harness                                | `DONE` | 2026-04-11. Vitest integration tests (13 tests) hitting local Supabase. All 7 `can_see_last_seen()` gate scenarios + `get_last_seen()` RPC + edge cases (unauthenticated, soft-deleted messages). Separate `vitest.integration.config.ts` (node env). Reusable helpers: `createTestUser` (signup-based), `seedProfile`/`seedConnection`/`seedConversation`, `cleanupTestUsers` (direct Postgres). `npm run test:integration`. `pg` dev dependency for cleanup.                                                          |
| 47a   | Events: core (CRUD + RSVP + invites)                 | `DONE` | 2026-04-09. Migrations `00039`–`00043`: `events`, `event_cohosts`, `event_invites`, `event_rsvps`, `event_waitlist` + RLS. Verified-only create, rate-limited 3/7d. Public/private, physical/virtual/hybrid locations, timezone-aware. RSVP going/maybe/cant_go with capacity + auto-promoting waitlist. Invite-from-connections + per-invitee +1 guest. Edit cascade (time/location resets RSVPs). Soft-delete cancellation. Co-hosts (up to 3). Attendee privacy: count public, Going names gated through `get_event_going_attendee_ids` RPC (resolves RLS self-reference — see `docs/debug/f47a-rsvp-recursion.md`). Events list Upcoming/Past, detail page with Mapbox pin + `.ics`. Navbar entry. Still open (non-blocking): anonymous `.ics` service-role wiring, cover-image upload UI, invite-from-connections UI, "near me" filter. **Unblocks F47b–f.** |
| 47b   | Events: radius notifications                         | `DONE` | 2026-04-09. Migration `00044`: `profiles.notify_events_within_km` (5–500km, null=off), `event_nearby` notification type, `daily_email_counters` table, `events_find_nearby_recipients()` Haversine RPC (SECURITY DEFINER, excludes creator/blocked/inactive), `increment_email_counter()`/`get_email_counter()` RPCs. Broadcast chained after geocoding in `createEvent` (fire-and-forget). Caps: 50 emails/event, 80/day; overflow degrades to in-app only. Resend throttle (3 emails/s batch). `eventNearbyEmail` template. Settings UI: email toggle + radius dropdown at `/settings/notifications`. i18n (en+vi). Migration `00045`: fix cancel-event RLS (SELECT policy `events_select_own` allows creator to see soft-deleted rows; relaxed `events_update_host` WITH CHECK). |
| 47c   | Events: flat comment thread                          | `DONE` | 2026-04-09. `event_comments` table + RLS. Flat thread on event detail page. Soft-delete (author + admin/mod). Report integration with moderation queue (`content_type = 'event_comment'`). Confirm dialogs for delete/report. Notify host + prior commenters. i18n (en+vi).                                                                                                                  |
| 47d   | Events: recurring (weekly/monthly)                   | `TODO` | `event_series` table. Series materializes child `events` rows on create. Edit UI: "this occurrence" / "this and following" (splits series) / "all". Cancel one vs cancel series. RSVPs per-occurrence. Genuinely complex; dedicated session. Depends on F47a.                                                                                                                                |
| 47e   | Events: day-of QR check-in                           | `DONE` | 2026-04-10. Migration `00047`: `event_checkins` table + RLS + `checkin_user()` SECURITY DEFINER RPC (validates time window + Going RSVP) + `get_event_checkin_count()` RPC + Realtime. HMAC-SHA256 signed tokens (90s TTL, 60s rotation) via `QR_CHECKIN_SECRET`. Host page `/events/[id]/host` with `qrcode.react` QR, live attendee list via Realtime, search. Scanner page `/events/[id]/checkin?token=...` validates token + processes checkin. Check-in button on event detail (host-only, within time window). Idempotent (already-checked-in handling). |
| 47f   | Events: group linkage + bulk-invite members          | `DONE` | 2026-04-10. Migration `00048`: `events.group_id` FK (nullable, `ON DELETE SET NULL`) + index, `group_bulk_invite_log` table + RLS. Group member RLS SELECT policy on events. `group_id` in Zod schema + `buildEventPayload` + group membership validation in `createEvent`. Event form: "Link to group" optional picker (user's groups). Event detail: "Organized by [Group]" chip + `BulkInviteButton` (owner/moderator, confirm dialog, 100-member cap, 7-day rate limit). Group detail: "Upcoming events" section. Shared 80/day email cap with F47b. Blocked users excluded from bulk invite. No +1 guest on group invites. |
| 38    | Multi-school support                                 | `TODO` | Phase 4. School-scoped RLS, school-scoped routing (`/schools/:slug/...`), school admin roles, `school_id` on `users`.                                                                                                                                                                                                                                                                         |
| 39    | Admin: school management UI                          | `TODO` | Phase 4. CRUD for schools table. Currently seed-only.                                                                                                                                                                                                                                                                                                                                         |


---

## Data Model

### Core Tables

```
users
├── id (uuid, PK)
├── email (unique)
├── password_hash (managed by Supabase Auth)
├── role (enum: user, moderator, admin)
├── verification_status (enum: unverified, pending, verified, rejected)
├── is_active (boolean — soft delete flag)
├── deleted_at (timestamp, nullable)
├── deletion_requested_at (timestamp, nullable — self-service deletion tracking)
├── deletion_reason (text, nullable — user-provided reason for leaving)
├── preferred_language (text, default 'en' — CHECK: 'en' or 'vi')
├── created_at
└── updated_at

account_deletion_log
├── id (uuid, PK)
├── user_id (uuid — no FK, user is deleted)
├── email (text)
├── deletion_requested_at (timestamp)
├── hard_deleted_at (timestamp)
├── reason (text, nullable)
├── data_export_generated (boolean)
└── created_at

schools
├── id (uuid, PK)
├── name (text)
├── name_en (text, nullable)
├── abbreviation (text, nullable)
├── slug (text, UNIQUE)
├── school_type (text: high_school, university, college)
├── program_duration_years (integer)
├── founded_year (integer)
├── first_graduating_year (integer)
├── country, state_province, city (text, nullable)
├── website_url, logo_url (text, nullable)
├── is_active (boolean)
├── created_at
└── updated_at

profiles
├── id (uuid, PK)
├── user_id (FK → users)
├── full_name
├── photo_url
├── bio
├── graduation_year (integer)
├── school_id (FK → schools)
├── primary_industry_id (FK → industries)
├── primary_specialization_id (FK → specializations, nullable)
├── secondary_industry_id (FK → industries, nullable)
├── secondary_specialization_id (FK → specializations, nullable)
├── country
├── state_province
├── city
├── latitude (double precision, nullable — geocoded from city/country)
├── longitude (double precision, nullable — geocoded from city/country)
├── location_geocoded_at (timestamptz, nullable)
├── has_contact_details (boolean, default false)
├── profile_completeness (integer, 0-100)
├── last_active_at (timestamptz — updated via throttled touch_last_seen() RPC from proxy, F45)
├── show_last_active (boolean, default true — F45 privacy toggle; when false, get_last_seen() returns NULL to viewers)
├── last_profile_update_at
├── created_at
└── updated_at

profile_contact_details
├── id (uuid, PK)
├── profile_id (FK → profiles, UNIQUE, ON DELETE CASCADE)
├── personal_email (text, nullable)
├── phone (text, nullable, max 30)
├── linkedin_url (text, nullable)
├── github_url (text, nullable)
├── website_url (text, nullable)
├── created_at
└── updated_at

career_entries
├── id (uuid, PK)
├── profile_id (FK → profiles, ON DELETE CASCADE)
├── job_title (text, NOT NULL)
├── company (text, NOT NULL)
├── industry_id (FK → industries, nullable)
├── specialization_id (FK → specializations, nullable)
├── start_date (date, NOT NULL)
├── end_date (date, nullable — null = current)
├── description (text, nullable, max 500)
├── is_current (boolean, default false)
├── sort_order (integer, default 0)
├── created_at
└── updated_at

education_entries
├── id (uuid, PK)
├── profile_id (FK → profiles, ON DELETE CASCADE)
├── institution (text, NOT NULL)
├── degree (text, nullable)
├── field_of_study (text, nullable)
├── start_year (integer, nullable)
├── end_year (integer, nullable)
├── sort_order (integer, default 0)
├── created_at
└── updated_at

industries
├── id (uuid, PK)
├── name
├── slug (unique)
├── is_archived (boolean)
├── sort_order (integer)
├── created_at
└── updated_at

specializations
├── id (uuid, PK)
├── industry_id (FK → industries)
├── name
├── slug (unique)
├── is_archived (boolean)
├── sort_order (integer)
├── created_at
└── updated_at

availability_tag_types
├── id (uuid, PK)
├── name (text, NOT NULL, UNIQUE)
├── slug (text, NOT NULL, UNIQUE)
├── description (text, nullable)
├── is_archived (boolean, default false)
├── sort_order (integer, default 0)
├── created_at
└── updated_at

user_availability_tags
├── id (uuid, PK)
├── profile_id (FK → profiles, ON DELETE CASCADE)
├── tag_type_id (FK → availability_tag_types, ON DELETE CASCADE)
├── created_at
└── UNIQUE(profile_id, tag_type_id)
```

### Connection & Messaging Tables

```
connections
├── id (uuid, PK)
├── requester_id (FK → users)
├── receiver_id (FK → users)
├── status (enum: pending, accepted, rejected)
├── message (text, nullable — intro message)
├── created_at
└── updated_at
UNIQUE(requester_id, receiver_id)

blocks
├── id (uuid, PK)
├── blocker_id (FK → users)
├── blocked_id (FK → users)
├── created_at
UNIQUE(blocker_id, blocked_id)

conversations
├── id (uuid, PK)
├── created_at
└── updated_at

conversation_participants
├── conversation_id (FK → conversations)
├── user_id (FK → users)
├── last_read_at (timestamp)
PRIMARY KEY(conversation_id, user_id)

messages
├── id (uuid, PK)
├── conversation_id (FK → conversations)
├── sender_id (FK → users)
├── content (text, encrypted at rest)
├── is_reported (boolean)
├── created_at
└── updated_at
```

### Admin & Moderation Tables

```
verification_requests
├── id (uuid, PK)
├── user_id (FK → users)
├── graduation_year (integer)
├── student_id (text, nullable)
├── specialization_name (text)
├── school_id (FK → schools)
├── supporting_info (text, nullable)
├── status (enum: pending, approved, rejected)
├── reviewed_by (FK → users, nullable)
├── review_message (text, nullable)
├── created_at
└── reviewed_at

message_attachments
├── id (uuid, PK)
├── message_id (FK → messages, ON DELETE CASCADE)
├── uploader_id (FK → users)
├── file_name (text)
├── file_path (text — storage path: {user_id}/{conversation_id}/{uuid}.{ext})
├── file_size (integer — bytes)
├── content_type (text — MIME type)
├── attachment_type (text — 'image' or 'document')
├── width (integer, nullable — image dimensions)
├── height (integer, nullable — image dimensions)
├── is_deleted (boolean, default false)
├── deleted_at (timestamp, nullable)
├── storage_deleted_at (timestamp, nullable — when purged from storage)
├── created_at
└── updated_at

message_reports
├── id (uuid, PK)
├── message_id (FK → messages)
├── reporter_id (FK → users)
├── reason (text)
├── status (enum: pending, reviewed, actioned, dismissed)
├── reviewed_by (FK → users, nullable)
├── action_taken (text, nullable)
├── created_at
└── reviewed_at

moderation_actions
├── id (uuid, PK)
├── target_user_id (FK → users)
├── action_by (FK → users)
├── action_type (enum: warn, mute, unmute, ban, suspend, unsuspend)
├── reason (text)
├── duration_hours (integer, nullable — for mute/suspend)
├── expires_at (timestamp, nullable)
├── created_at

admin_audit_log
├── id (uuid, PK)
├── admin_id (FK → users)
├── action (text)
├── target_type (text — user, group, taxonomy, etc.)
├── target_id (uuid)
├── details (jsonb)
├── created_at

notifications
├── id (uuid, PK)
├── user_id (FK → users)
├── type (enum: connection_request, connection_accepted, new_message, verification_update, announcement, report_action, group_invite)
├── title (text)
├── body (text)
├── link (text, nullable)
├── is_read (boolean)
├── created_at

announcements
├── id (uuid, PK)
├── title
├── body (text)
├── link (text, nullable)
├── created_by (FK → users)
├── is_active (boolean)
├── published_at (timestamp)
├── created_at
└── updated_at

dismissed_announcements
├── id (uuid, PK)
├── user_id (FK → users)
├── announcement_id (FK → announcements, CASCADE)
├── created_at
└── UNIQUE(user_id, announcement_id)

app_settings
├── key (text, PK)
├── value (jsonb)
├── description (text, nullable)
├── updated_at
└── updated_by (FK → users, nullable)

groups
├── id (uuid, PK)
├── name (text, UNIQUE)
├── slug (text, UNIQUE)
├── description (text, nullable)
├── type (enum: year_based, field_based, location_based, custom)
├── cover_image_url (text, nullable — Phase 2)
├── max_members (integer, nullable — Phase 2)
├── created_by (FK → users)
├── is_active (boolean)
├── deleted_at (timestamp, nullable)
├── created_at
└── updated_at

group_members
├── id (uuid, PK)
├── group_id (FK → groups)
├── user_id (FK → users)
├── role (enum: member, moderator, owner — default 'member')
├── created_at
└── updated_at
UNIQUE(group_id, user_id)

bulk_invites
├── id (uuid, PK)
├── email
├── name (text, nullable)
├── graduation_year (integer, nullable)
├── invited_by (FK → users)
├── status (enum: invited, signed_up, verified)
├── invited_at
└── signed_up_at (timestamp, nullable)
```

### Database Indexes (Key)

- `profiles(graduation_year)` — year-based filtering
- `profiles(primary_industry_id, primary_specialization_id)` — field filtering
- `profiles(country, state_province, city)` — location filtering
- `profiles(latitude, longitude) WHERE latitude IS NOT NULL` — map spatial queries
- `profiles(full_name) USING gin(to_tsvector(...))` — full-text search
- `career_history(profile_id, is_current)` — current job lookup
- `connections(requester_id, status)` and `connections(receiver_id, status)` — connection queries
- `messages(conversation_id, created_at)` — message ordering
- `notifications(user_id, is_read, created_at)` — notification feed
- `groups(type)` — type-based filtering
- `groups(is_active) WHERE is_active = true` — active groups partial index
- `group_members(group_id)` and `group_members(user_id)` — membership lookups

---

## Technical Architecture

### Stack

- **Frontend**: Next.js (App Router) + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (Postgres + Auth + Realtime + Storage + Edge Functions)
- **Email**: Resend
- **Maps**: Mapbox GL JS (`react-map-gl`) + Nominatim (geocoding)
- **Deployment**: Vercel (frontend) + Supabase (backend)
- **State management**: React Server Components + `nuqs` for URL state + React Context for client state

### Key Architecture Decisions

1. **Server Components by default**: fetch data on the server, minimize client-side JS. Use client components only for interactivity (messaging, real-time, forms).
2. **Supabase Row-Level Security (RLS)**: enforce access control at the database level. Unverified users physically cannot query restricted columns.
3. **Real-time messaging via Supabase Realtime**: subscribe to the `messages` table filtered by `conversation_id`. No custom WebSocket server needed.
4. **Edge Functions for background jobs**: recommendation scoring, email sending, data export generation. Triggered by database webhooks or cron.
5. **Image storage**: profile photos stored in Supabase Storage with public URLs. Resized on upload via Edge Function.

### API Design

- **No separate API layer**: use Next.js Server Actions for mutations, Server Components for reads, and Supabase client for real-time subscriptions.
- **Supabase client**: use `@supabase/ssr` for server-side auth, `@supabase/supabase-js` for client-side real-time.

### Security

- RLS policies on every table
- Input sanitization on all user-generated content
- Rate limiting via Supabase Edge Functions or middleware
- CSRF protection via Next.js built-in
- Content Security Policy headers
- Message content encrypted at rest (Supabase default encryption + optional column-level)

---

## Feature Dependency Graph

```mermaid
graph TD
    F1[F1: Project Scaffolding] --> F2[F2: Auth]
    F2 --> F3[F3: Verification]
    F2 --> F4[F4: Profile - Basic]
    F4 --> F5[F5: Career History]
    F4 --> F6[F6: Education History]
    F4 --> F7[F7: Location]
    F4 --> F8[F8: Availability Tags]
    F4 --> F9[F9: Visibility Controls]
    F4 --> F10[F10: Industry Taxonomy]
    F10 --> F11[F11: Directory Search]
    F11 --> F12[F12: Pagination]
    F4 --> F13[F13: Recommendations]
    F5 --> F13
    F7 --> F13
    F10 --> F13
    F2 --> F14[F14: Onboarding Quiz]
    F4 --> F15[F15: Same-Year Classmates]
    F4 --> F16[F16: Popular Profiles]
    F3 --> F17[F17: Connections]
    F17 --> F18[F18: Messaging]
    F18 --> F19[F19: Message Rate Limiting]
    F18 --> F20[F20: Message Reporting]
    F17 --> F21[F21: In-App Notifications]
    F18 --> F22[F22: Email Notifications]
    F3 --> F23[F23: Groups]
    F3 --> F24[F24: Admin - Verification Queue]
    F3 --> F25[F25: Admin - User Management]
    F24 --> F26[F26: Admin - Analytics]
    F10 --> F27[F27: Admin - Taxonomy Mgmt]
    F7 --> F28[F28: Alumni World Map]
    F11 --> F28
    F26 --> F28a[F28a: Admin Map]
    F28 --> F28a
    F2 --> F29[F29: Admin - Bulk Invite]
    F21 --> F30[F30: Admin - Announcements]
    F20 --> F31[F31: Moderator - Report Queue]
    F25 --> F32[F32: Moderator - User Actions]
    F4 --> F33[F33: Account Delete + Export]
    F4 --> F34[F34: Profile Staleness Prompts]
    F4 --> F35[F35: Responsive Design]
    F2 --> F35c1[F35c-1: Role Escalation RLS]
    F18 --> F35c2[F35c-2: Block Bypass Fix]
    F26 --> F35c3[F35c-3: Analytics RPC Auth]
    F2 --> F35c4[F35c-4: Proxy Fail-Closed]
    F18 --> F35c5[F35c-5: Duplicate Conversations]
    F18 --> F35c6[F35c-6: RT Gap Fill]
    F18 --> F35c7[F35c-7: Participant RLS]
    F35c5 --> F35c7
    F2 --> F35c8[F35c-8: Email Enumeration]
    F41 --> F42[F42: Google Profile Import]
    F4 --> F42
    F35c1 --> F36[F36: Deployment]
    F35c2 --> F36
    F35c3 --> F36
    F35c4 --> F36
    F35c5 --> F36
    F35c6 --> F36
    F35c7 --> F36
    F35c8 --> F36
```



