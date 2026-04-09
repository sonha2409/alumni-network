-- =============================================================================
-- Migration 00041: Fix self-referential recursion on event_rsvps SELECT policy
--
-- Problem:
--   event_rsvps_select_self_host_or_fellow_going uses an EXISTS subquery that
--   reads event_rsvps itself to decide whether the viewer is a fellow "Going"
--   attendee. Postgres re-applies RLS on the inner query, which re-enters
--   the same policy — infinite recursion.
--
-- Fix:
--   Extract the "is viewer Going at this event" check into a SECURITY DEFINER
--   helper (has_going_rsvp) that bypasses RLS on its inner query.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.has_going_rsvp(
  p_event_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_rsvps
    WHERE event_id = p_event_id
      AND user_id = p_user_id
      AND status = 'going'
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_going_rsvp(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "event_rsvps_select_self_host_or_fellow_going"
  ON public.event_rsvps;

CREATE POLICY "event_rsvps_select_self_host_or_fellow_going"
  ON public.event_rsvps FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_event_host(event_id, auth.uid())
    OR (
      status = 'going'
      AND public.has_going_rsvp(event_id, auth.uid())
    )
  );
