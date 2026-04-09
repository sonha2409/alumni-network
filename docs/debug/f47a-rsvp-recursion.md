# F47a RSVP — Infinite recursion debug log

**Status:** ✅ RESOLVED 2026-04-09.

## Resolution

The recursion was never in the fix attempts — it was that **the local
Supabase DB was silently stuck at migration 00039**. `supabase db push`
only updates remote; it does not apply migrations to the running local
Postgres container. All four "attempts" (00041, 00042, 00043) were being
judged by a dev server connected to a localhost DB where none of them
had ever been applied, so we kept seeing the original recursive
`event_rsvps_select_self_host_or_fellow_going` policy from 00039.

**Diagnosis steps that cracked it**, for posterity:

1. Queried `pg_policies` on the *local* DB — saw the original recursive
   SELECT policy still present.
2. Queried `supabase_migrations.schema_migrations` — only 00039 and
   00040 listed. 00041/00042/00043 had never run locally.
3. Ran `supabase migration up` — applied all three in order cleanly.
4. Re-queried `pg_policies` — final state matched 00043's design
   (`event_rsvps_select_self_or_host`, no subquery).
5. User manually retested RSVP Going/Maybe/Can't-go on localhost — all
   three succeeded with success toasts and persisted on reload.

**Root cause takeaway:** `supabase db push` targets remote only.
`supabase migration up` (or `supabase db reset`) applies pending
migrations to the local container. These are separate operations and
a successful `db push` says nothing about local DB state.

**Design conclusion:** 00043's policy (`event_rsvps_select_self_or_host`
with attendee-name visibility routed through the
`get_event_going_attendee_ids` RPC) is the correct end state. 00041 and
00042 were dead-ends but remain in the migration history since they
were already pushed to remote. No `00044` canonical re-assertion was
needed — the chain 00039 → 00043 converges to the right state on a
clean `db reset`.

**Remote verification status:** NOT independently verified as of
2026-04-09. The debug doc asserts 00041/00042/00043 were pushed to
remote, but nobody has run `pg_policies` / `schema_migrations` queries
against remote to confirm. Before the first `git push` of F47a app
code, run the five diagnostic queries (below) against remote. If remote
is at the 00043 state, everything deploys cleanly. If not, paste a
forward-only idempotent fix block into the Supabase SQL editor.

---

## Original debug log (preserved for context)

**Status at time of writing:** UNRESOLVED. `rsvp()` server action still
returns `infinite recursion detected in policy for relation
"event_rsvps"` after four remediation attempts. Start a fresh session
with this document as context.

## Feature context

- Building **F47a — Events core** (SPEC.md row F47a, FEATURES.md §F47a).
- Code in `src/app/(main)/events/**`, schema in
  `supabase/migrations/00039_create_events_tables.sql`.
- Everything else in F47a works: create event, cancel event, edit event,
  the detail page renders, the events list works. The recursion only
  fires on the `rsvp()` server action path (any RSVP status).

## The failing call

File: `src/app/(main)/events/rsvp-actions.ts`, function `rsvp()`.

Repro: visit `/events/[id]` on any event as a verified user → click any
of Going / Maybe / Can't go → toast shows:

```
RSVP failed: infinite recursion detected in policy for relation "event_rsvps"
```

Server log:

```
[ServerAction:rsvp] {
  userId: 'a0000000-0000-4000-8000-000000100001',
  eventId: 'cb5bacc1-44ae-4fce-80bf-c8bbfba83a12',
  error: 'infinite recursion detected in policy for relation "event_rsvps"'
}
POST /events/... 200 in 503ms
```

The same user IS verified (they can create events — `createEvent` works
with the same verified check + insert pattern, just on the `events`
table). Event creation touches a different set of RLS policies and
doesn't hit this.

## The exact DB call that fails

Inside `rsvp()` (`rsvp-actions.ts`):

```ts
const { error } = await supabase.from("event_rsvps").upsert(
  {
    event_id: eventId,
    user_id: user.id,
    status,          // 'going' | 'maybe' | 'cant_go'
    plus_one_name: plusOneName ?? null,
    plus_one_email: plusOneEmail ?? null,
    needs_reconfirm: false,
  },
  { onConflict: "event_id,user_id" }
);
```

Before this upsert, we do NOT select `event_rsvps` unless
`status === 'going' && event.capacity !== null`. For unlimited-capacity
events (the repro case), the upsert is the first hit.

## What we tried (and why each failed)

### Attempt 1 — 00039 original policy

Defined by 00039:

```sql
CREATE POLICY "event_rsvps_select_self_host_or_fellow_going"
  ON public.event_rsvps FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_event_host(event_id, auth.uid())
    OR (
      status = 'going'
      AND EXISTS (
        SELECT 1 FROM public.event_rsvps self
        WHERE self.event_id = event_rsvps.event_id
          AND self.user_id = auth.uid()
          AND self.status = 'going'
      )
    )
  );
```

**Problem:** self-referential `EXISTS (SELECT FROM event_rsvps ...)`
inside the SELECT policy on event_rsvps → classic recursion.

### Attempt 2 — 00041: SQL helper `has_going_rsvp`

Routed the self-ref through a `SECURITY DEFINER` helper:

```sql
CREATE FUNCTION has_going_rsvp(event_id, user_id)
  LANGUAGE SQL STABLE SECURITY DEFINER
  AS $$ SELECT EXISTS (SELECT 1 FROM event_rsvps WHERE ...) $$;
```

**Did not fix it.** My theory at the time: `LANGUAGE SQL STABLE` functions
can be *inlined* by the query planner, losing SECURITY DEFINER.

### Attempt 3 — 00042: plpgsql version of `has_going_rsvp`

Same function, rewritten `LANGUAGE plpgsql STABLE SECURITY DEFINER`.
plpgsql is never inlined.

**Still did not fix it.** Recursion error unchanged. This is the part
that genuinely surprised me. Theory (unverified):

- On Supabase, the migration role that runs `supabase db push` is
  `postgres` but may not effectively have `BYPASSRLS`, or the tables are
  owned by a different role, so `SECURITY DEFINER` doesn't actually
  bypass RLS the way the Postgres docs describe.
- We did not verify this. Nobody has looked at `pg_proc.proowner`,
  `pg_class.relowner`, or `pg_roles.rolbypassrls` for these objects on
  remote. **That's the first thing to do in the next session.**

### Attempt 4 — 00043: drop the self-reference entirely

Current state on remote. Migration removed the fellow-Going clause from
the policy and moved name-privacy to an RPC instead:

```sql
DROP POLICY "event_rsvps_select_self_host_or_fellow_going"
  ON public.event_rsvps;

CREATE POLICY "event_rsvps_select_self_or_host"
  ON public.event_rsvps FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_event_host(event_id, auth.uid())
  );

DROP FUNCTION has_going_rsvp;

CREATE FUNCTION get_event_going_attendee_ids(p_event_id UUID)
  RETURNS SETOF UUID
  LANGUAGE plpgsql STABLE SECURITY DEFINER
  -- Internally gated: returns empty unless caller is host or Going
  ...
```

Also updated `src/app/(main)/events/[id]/page.tsx` to call
`get_event_going_attendee_ids` via `supabase.rpc(...)` instead of
joining `event_rsvps` directly.

**Still getting the same error on the RSVP path.** This is now very
strange because:

- The new SELECT policy has NO subquery at all on `event_rsvps`.
- `is_event_host(event_id, auth.uid())` only queries `events` and
  `event_cohosts`, not `event_rsvps`.
- There is no remaining RLS clause on `event_rsvps` that could recurse.
- The `event_rsvps` INSERT policy is static (`user_id = auth.uid()` +
  verified check on `users`). The UPDATE policy is likewise static.

Yet the error is identical: `infinite recursion detected in policy for
relation "event_rsvps"`. That means either:

1. The remote DB still has an old version of some policy or function
   that we think we dropped. **High likelihood.** Supabase migrations
   occasionally partially apply when pushes error mid-transaction.
2. The recursion is being triggered by a different RLS path we haven't
   identified — e.g., the UPDATE branch of the upsert touching some
   other policy chain.
3. `is_event_host` or `promote_event_waitlist` transitively references
   `event_rsvps` in a way that recurses. But neither is invoked on the
   plain upsert path.

## First things to check in the fresh session

Run these queries against the **remote** DB (Supabase SQL editor or
`psql` via the connection string) and paste results into the new
session:

```sql
-- 1. What SELECT policies currently exist on event_rsvps?
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'event_rsvps';

-- 2. What functions reference event_rsvps in their body?
SELECT proname, prosecdef, provolatile, prolang::regtype, prosrc
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND prosrc ILIKE '%event_rsvps%';

-- 3. Does the migration role / function owner have BYPASSRLS?
SELECT rolname, rolbypassrls, rolsuper
FROM pg_roles
WHERE rolname IN ('postgres', 'supabase_admin', 'authenticator');

-- 4. Who owns event_rsvps and is FORCE RLS on?
SELECT relname, relowner::regrole, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname = 'event_rsvps';

-- 5. Try the raw INSERT as an authenticated user via the SQL editor
--    (set_config auth.uid() first) to see the raw error and EXPLAIN
--    for the failing statement.
```

Expected outcome of (1): exactly one SELECT policy with a simple
`user_id = auth.uid() OR is_event_host(...)` USING clause and NO
subquery. If there is still a policy with a subquery on `event_rsvps`,
migration 00043 did not fully apply and we need to fix that first.

## Files to read when resuming

- `supabase/migrations/00039_create_events_tables.sql` — original
  schema + all four RLS policies (SELECT, INSERT, UPDATE, DELETE) for
  `event_rsvps`.
- `supabase/migrations/00040_fix_events_rls_recursion.sql` — fixed the
  `events` table recursion (worked).
- `supabase/migrations/00041_fix_event_rsvps_recursion.sql` — SQL helper
  (didn't fix).
- `supabase/migrations/00042_has_going_rsvp_plpgsql.sql` — plpgsql
  version (didn't fix).
- `supabase/migrations/00043_event_rsvps_simplify_select.sql` — current
  attempted fix.
- `src/app/(main)/events/rsvp-actions.ts` — the `rsvp()` action that
  triggers the error.
- `src/app/(main)/events/[id]/page.tsx` — now uses the attendee RPC.
- `docs/debug/f47a-rsvp-recursion.md` — this file.

## Other F47a findings still open (not blockers)

1. `.ics` unauthenticated path is scaffolded but refuses anonymous
   access — needs service-role client wiring.
2. No cover-image upload UI (URL field only; bucket exists).
3. No invite-from-connections UI on the detail page (action exists).
4. No "near me" filter on `/events`.
5. Tests only cover pure helpers — integration tests blocked by F45a
   harness as agreed.

## Session context

- Feature: F47a, blocking all of F47b–f.
- All code changes for F47a are committed only locally, NOT pushed to
  `origin/main`. Do NOT commit until RSVP works end-to-end.
- Migrations 00039–00043 ARE on remote. If rolled back, delete in
  reverse order and drop related tables.
- F47a schema was pushed with user consent implicit (00039, 00040) and
  explicit (00041, 00042, 00043).
