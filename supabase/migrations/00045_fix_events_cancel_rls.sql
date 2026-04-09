-- =============================================================================
-- Fix: cancelEvent soft-delete blocked by RLS
-- =============================================================================
-- Root cause: All SELECT policies on events require `deleted_at IS NULL`.
--   PostgreSQL requires the *new* row to pass SELECT policies after an UPDATE.
--   Setting deleted_at makes the row invisible → UPDATE rejected.
--
-- Fix: Add a SELECT policy allowing creators to see their own events
--   regardless of deleted_at. This lets the soft-delete UPDATE succeed
--   and also lets creators see their cancelled events if needed.
--
-- Also relax events_update_host WITH CHECK so the new row (with deleted_at
--   set) still passes.
-- =============================================================================

-- 1. SELECT policy: creator can always see their own events (including deleted)
CREATE POLICY "events_select_own"
  ON public.events FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

-- 2. Relax UPDATE WITH CHECK: creator_id must not change, but allow deleted_at
DROP POLICY IF EXISTS "events_update_host" ON public.events;

CREATE POLICY "events_update_host"
  ON public.events FOR UPDATE
  TO authenticated
  USING (public.is_event_host(id, auth.uid()))
  WITH CHECK (creator_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.event_cohosts WHERE event_id = id AND user_id = auth.uid()
  ));
