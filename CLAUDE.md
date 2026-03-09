# AlumNet — Development Rules

## Project Overview
Alumni network platform. Single-school deployment.
- **Spec**: See `SPEC.md` for full product specification and feature log.
- **Stack**: Next.js (App Router) + Supabase + shadcn/ui + Tailwind CSS + TypeScript

## Ground Rules

### Before Every Session
1. Read `SPEC.md` — check the **Feature Log** table to know what's done and what's next.
2. After completing a feature, update the Feature Log status from `TODO` to `DONE` with the date.
3. If a feature is partially complete, mark it `IN PROGRESS` with notes.

### Code Style
- TypeScript strict mode. No `any` types unless absolutely unavoidable (and add a `// TODO: type this` comment).
- Use Server Components by default. Only use `"use client"` when the component needs interactivity (event handlers, hooks, real-time subscriptions).
- Prefer Server Actions for mutations over API routes.
- Use `@supabase/ssr` for server-side Supabase access, `@supabase/supabase-js` for client-side real-time only.
- File naming: `kebab-case` for files and folders, `PascalCase` for components, `camelCase` for functions and variables.
- Co-locate related files: page + components + actions in the same route folder.
- **Brownfield-first**: Always read existing types, schemas, and components before suggesting new ones. Match existing patterns and conventions in the codebase.

### Next.js Conventions
- App Router only. No Pages Router.
- Route groups for layout organization: `(auth)`, `(main)`, `(admin)`.
- Use `loading.tsx` for suspense boundaries, `error.tsx` for error boundaries.
- Dynamic routes: `[id]` for single items, use `generateStaticParams` where appropriate.

### Supabase Conventions
- Always use Row-Level Security (RLS). Never disable RLS on any table.
- Write RLS policies that enforce role-based access (unverified vs verified vs moderator vs admin).
- Use Supabase migrations for all schema changes (`supabase/migrations/`).
- Never hardcode Supabase keys — use environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

### UI/UX
- Mobile-first responsive design. Test at 375px, 768px, 1024px, 1280px.
- Use shadcn/ui components as the base. Customize with Tailwind, don't override with custom CSS.
- Skeleton loading states for all async data.
- Empty states with helpful CTAs, not blank screens.
- Toast notifications for user actions (success/error).
- Dark mode support via Tailwind `dark:` prefix.

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

### Testing
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
```

For small changes (typos, config tweaks, single-line fixes), layers can be condensed but approval is still required.

### Node.js Compatibility
- Node v25: `npx next build` may fail. Use `node node_modules/next/dist/bin/next build` instead.
- shadcn/ui v4 uses `@base-ui/react` — Button has no `asChild` prop; wrap with `Link` instead.

### What NOT To Do
- Don't add features not in the spec without discussion.
- Don't over-engineer. Build the Phase 1 version, not the Phase 3 version.
- Don't skip RLS policies "for now" — security from day one.
- Don't create separate API route files when Server Actions suffice.
- Don't install packages without checking if Supabase or shadcn/ui already provides the functionality.
