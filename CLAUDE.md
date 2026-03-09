# AlumNet — Development Rules

## Project Overview
Alumni network platform. Single-school deployment.
- **Spec**: See `SPEC.md` for status tracking (Feature Log), data model (schema), technical architecture, and dependency graph.
- **Features**: See `FEATURES.md` for detailed functional requirements (F1–F13), user roles, UI/UX guidelines, and future scaling path.
- **Plan**: See `PLAN.md` for implementation strategy and build order.
- **Stack**: Next.js (App Router) + Supabase + shadcn/ui + Tailwind CSS + TypeScript

## Ground Rules

### Before Every Session
1. Read `SPEC.md` — check the **Feature Log** table to know what's done and what's next.
2. Read `FEATURES.md` — review the detailed requirements for the next `TODO` item (specific logic, edge cases, acceptance criteria).
3. Read `PLAN.md` for implementation order and strategy.
4. After completing a feature, update the Feature Log in `SPEC.md` from `TODO` to `DONE` with the date.
5. If a feature is partially complete, mark it `IN PROGRESS` with notes.

### Code Style
- TypeScript strict mode. No `any` types unless absolutely unavoidable (and add a `// TODO: type this` comment).
- Use Server Components by default. Only use `"use client"` when the component needs interactivity (event handlers, hooks, real-time subscriptions).
- Prefer Server Actions for mutations over API routes.
- Use `@supabase/ssr` for server-side Supabase access, `@supabase/supabase-js` for client-side real-time only.
- File naming: `kebab-case` for files and folders, `PascalCase` for components, `camelCase` for functions and variables.
- Co-locate related files: page + components + actions in the same route folder.
- **Brownfield-first**: Always read existing types, schemas, and components before suggesting new ones. Match existing patterns and conventions in the codebase.

### Error Handling
- Server Actions return a discriminated union: `ActionResult<T> = { success: true; data: T } | { success: false; error: string; fieldErrors?: Record<string, string[]> }`.
- Use **Zod** for all input validation (already a dependency of shadcn/ui).
- Wrap Supabase calls in try/catch. Log the raw error server-side, return a sanitized user-friendly message to the client.
- `error.tsx` is the last resort for unhandled errors, not the primary error communication channel. Use `ActionResult` for expected errors.

### State Management
- **Server state** (default): Data fetched in Server Components. This is the primary data source.
- **URL state** (`nuqs`): Search filters, pagination, sort order — anything that should be bookmarkable or shareable.
- **Client state** (React Context): Auth session, theme, WebSocket connection status.
- **No global state library** (no Redux, Zustand). If you think you need one, you're over-fetching on the client.

### Caching
- Default `dynamic = 'force-dynamic'` for authenticated pages (RLS needs per-user auth context).
- Use `unstable_cache` for shared, non-user-specific data (taxonomy lists, announcements).
- Never cache messaging or notification data.

### Logging
- Structured format: `console.error('[ServerAction:actionName]', { userId, error: err.message })`.
- Never log sensitive data (passwords, tokens, full user objects).
- Phase 2: Sentry for error tracking when app has real users.

### Next.js Conventions
- App Router only. No Pages Router.
- Route groups for layout organization: `(auth)`, `(main)`, `(admin)`.
- Use `loading.tsx` for suspense boundaries, `error.tsx` for error boundaries.
- Dynamic routes: `[id]` for single items, use `generateStaticParams` where appropriate.

### Supabase Conventions
- Always use Row-Level Security (RLS). Never disable RLS on any table.
- Write RLS policies that enforce role-based access (unverified vs verified vs moderator vs admin).
- Use Supabase migrations for all schema changes (`supabase/migrations/`). Naming: `NNNNN_description.sql` (sequential).
- Never hardcode Supabase keys — use environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- **Auth architecture**: Supabase manages `auth.users` (email, password, JWT). `public.users` is a companion table with app fields (`role`, `verification_status`). A trigger auto-creates the `public.users` row on signup. All tables that reference "users" should FK to `public.users(id)`.
- **`updated_at` pattern**: Every table with `updated_at` must have the `handle_updated_at()` trigger. The function is defined once in the first migration; subsequent migrations only create the trigger on the new table.
- **Auth callback**: `/auth/callback` route handler exchanges Supabase email codes for sessions. All Supabase email flows (password reset, email verify) redirect through this route.
- **Proxy (middleware)**: Next.js 16 uses `src/proxy.ts` (not `middleware.ts`). Export a default function named `proxy`. The proxy refreshes the Supabase session on every request and handles auth redirects.

### UI/UX
- Mobile-first responsive design. Test at 375px, 768px, 1024px, 1280px.
- Use shadcn/ui components as the base. Customize with Tailwind, don't override with custom CSS.
- Skeleton loading states for all async data.
- Empty states with helpful CTAs, not blank screens.
- Toast notifications for user actions (success/error).
- Dark mode support via Tailwind `dark:` prefix.

### Accessibility
- Target **WCAG 2.1 AA** compliance.
- Use semantic HTML elements (`<nav>`, `<main>`, `<article>`, `<aside>`, `<section>`).
- All form inputs must have associated `<label>` elements.
- Don't remove shadcn/ui's built-in `aria-*` attributes when customizing components.
- Ensure sufficient color contrast ratios (4.5:1 for normal text, 3:1 for large text).

### Database
- All tables must have `id` (uuid), `created_at`, and `updated_at` columns.
- Use `uuid_generate_v4()` for primary keys.
- Soft delete pattern: `is_active` boolean + `deleted_at` timestamp. Never hard-delete user data directly.
- Add indexes for columns used in WHERE clauses and JOINs.

### Security
- Sanitize all user inputs on the server side.
- Never trust client-side data — always validate in Server Actions or Edge Functions.
- Rate limit sensitive endpoints (auth, messaging, connection requests).
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.

### Git
- Commit messages: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:` prefixes.
- One feature per commit when possible.
- Don't commit `.env` files or secrets.
- **Push after success**: After every successful implementation + build + tests (L5.5), commit and push to `origin/main`.
- Do not include `Co-Authored-By` lines in commit messages.

### Documentation
- **Three core files**: `SPEC.md` (status/schema/architecture), `FEATURES.md` (detailed requirements), `PLAN.md` (build strategy).
- **During L1–L4 design phases**: Reference `FEATURES.md` for the detailed requirements, edge cases, and acceptance criteria of the feature being designed.
- **After L5.5 success**: Update the Feature Log in `SPEC.md` — mark the feature `DONE` with the date.
- **Implementation docs** live in `docs/` directory.
- **Architecture Decision Records (ADRs)**: Create an ADR in `docs/adrs/` for every significant design choice (new table, auth flow change, third-party integration, architectural pattern). Use the template in `docs/adrs/000-template.md`.
- **Feature Implementation Notes**: After each successful feature implementation, write a note in `docs/features/` using the template in `docs/features/000-template.md`. Include architecture overview, data flow, component relationships, and diagrams.
- **Diagrams**: Use Mermaid syntax (renders natively on GitHub). Include diagrams for: data flow, component trees, state machines, sequence diagrams for multi-step processes, and ER diagrams for schema changes.
- **Keep docs current**: When modifying an existing feature, update its implementation notes. Stale docs are worse than no docs.
- **Naming**: ADRs use sequential numbering (`001-auth-strategy.md`). Feature notes use the feature name (`auth-registration.md`).

### Testing
- **Vitest** for unit + integration tests (native ESM/TS support, faster than Jest).
- **Playwright** for E2E tests.
- Test DB: `supabase db reset` between test runs for a clean state.
- Test critical paths: auth flow, verification, connections, messaging.
- Use Supabase local dev (`supabase start`) for development and testing.
- **TDD for bug fixes**: every bug fix must start with a failing test that reproduces the issue.
- **Test tiers**: Unit (~70%), Integration (~20%), E2E (~10%).
- **Structure**: Arrange → Act → Assert. One behavior per test.
- **Coverage**: happy path + error path + boundary cases + invalid input.
- **Naming**: `should_[expected]_when_[condition]` (e.g., `should_reject_when_email_invalid`).
- **Mocking**: mock at boundaries only (network, DB, external APIs). Never mock internal logic.
- **L5.5 mandatory**: run build + tests after every code change before considering it done.
- **No flaky tests**: fix within 48h or delete. Tests must be deterministic.

## Development Process (6-Layer Workflow)

Every feature or significant change follows this layered process. Do NOT skip layers.

### L1: Context
- Define the problem, affected user roles, and scale.
- Identify constraints from `SPEC.md` and existing codebase.
- **Checkpoint**: "Does this context match your understanding?"

### L2-L3: Architecture
- Present 2-3 design options with trade-offs (performance, complexity, maintainability).
- Recommend one option with rationale.
- **Checkpoint**: "Which approach do you prefer?"

### L4: Detailed Design
- Schema changes (migrations), API/Server Action signatures, component tree.
- Identify edge cases and error states.
- **Checkpoint**: "Is this design clear and complete?"

### L5: Implementation
- Write full, commented code following all Code Style rules.
- Keep changes minimal and focused on the approved design.

### L5.5: Verification
- **Mandatory**: Run `node node_modules/next/dist/bin/next build` to confirm no build errors.
- Run relevant tests. Fix any failures before proceeding.
- **Checkpoint**: "Build clean? Tests pass?"

### L6: Testing
- Write unit + integration tests for the new code.
- Follow the Testing section standards (tiers, naming, coverage).

### L7: Documentation
- **Mandatory** after successful L5.5/L6.
- Write or update feature implementation notes in `docs/features/`.
- Create an ADR in `docs/adrs/` if the feature involved a significant design decision.
- Include Mermaid diagrams for: data flow, component hierarchy, sequence diagrams (for multi-step flows), and ER diagrams (for schema changes).
- Update any existing docs affected by the change.
- **Checkpoint**: "Docs written? Diagrams accurate?"

## Approval Gates

- **Never write code without design approval.** Complete L1-L4 and get explicit confirmation before implementing.
- **Present options before editing**: "Option A: [description] vs Option B: [description]. Which do you prefer?"
- **Wait for explicit approval** ("go ahead", "use option A", etc.) before writing any code.
- **Checkpoint after each layer**: Pause and confirm before moving to the next layer.
- If requirements are ambiguous, ask — don't assume.

## Debugging Protocol

- **Diagnose first**: Identify the root cause before proposing fixes. Read relevant code and logs.
- **Present fix options**: Explain 2+ approaches with trade-offs when the fix is non-trivial.
- **Wait for approval**: Never auto-edit files on bug reports. Get confirmation before applying changes.
- **Verify the fix**: After applying, run build + tests (L5.5) to confirm the fix doesn't introduce regressions.

## Response Template

For feature work, structure responses using this format:

```
## CONTEXT (L1)
[Problem definition, user roles, constraints]
→ CHECKPOINT: "Does this match?"

## DESIGN (L2-L3)
[2-3 options with trade-offs, recommendation]
→ CHECKPOINT: "Which approach?"

## DETAILED DESIGN (L4)
[Schema, API signatures, edge cases]
→ CHECKPOINT: "Design clear?"

## IMPLEMENTATION (L5)
[Code changes]

## VERIFICATION (L5.5-L6)
[Build result, test results]
→ CHECKPOINT: "Build clean? Tests pass?"

## DOCUMENTATION (L7)
[Implementation notes, ADRs, diagrams]
→ CHECKPOINT: "Docs written? Diagrams accurate?"
```

**Fast Track**: Typo fixes, comment updates, dependency bumps, config value changes, `.gitignore` entries, README text edits. Process: L5 (implement) + L5.5 (verify build) only. No L1–L4 checkpoints required. No L7 docs unless behavior changes.

For other small changes (single-line fixes, minor refactors), layers can be condensed but approval is still required.

### Node.js Compatibility
- Node v25: `npx next build` may fail. Use `node node_modules/next/dist/bin/next build` instead.
- shadcn/ui v4 uses `@base-ui/react` — Button has no `asChild` prop; wrap with `Link` instead.

### What NOT To Do
- Don't add features not in the spec without discussion.
- Don't over-engineer. Build the Phase 1 version, not the Phase 3 version.
- Don't skip RLS policies "for now" — security from day one.
- Don't create separate API route files when Server Actions suffice.
- Don't install packages without checking if Supabase or shadcn/ui already provides the functionality.
