-- =============================================================================
-- Migration 00043: Remove self-reference from event_rsvps SELECT policy.
--
-- Background:
--   00039 defined a SELECT policy on event_rsvps that allowed a viewer to
--   see other users' "going" rows if the viewer themselves had a "going"
--   row on the same event. This requires a subquery on event_rsvps inside
--   its own SELECT policy.
--
--   We tried to route that subquery through a SECURITY DEFINER helper
--   (00041, 00042 in SQL then plpgsql). Neither worked on the remote DB:
--   Postgres still reports "infinite recursion detected in policy for
--   relation event_rsvps". The migration role in Supabase does not appear
--   to grant the function owner the BYPASSRLS behaviour required for the
--   SECURITY DEFINER bypass to take effect in this configuration.
--
-- Fix:
--   1. Simplify the SELECT policy: a row is visible iff the viewer owns it
--      OR is an event host. No self-reference — no recursion possible.
--   2. Preserve the attendee-name privacy gate via a dedicated
--      SECURITY DEFINER RPC get_event_going_attendee_ids() that returns
--      the list of Going user_ids only when the caller is a host or has
--      their own Going RSVP on the event. The detail page uses this RPC
--      instead of joining event_rsvps directly.
--   3. Drop the now-unused has_going_rsvp() helper.
-- =============================================================================

-- 1. Replace the SELECT policy
DROP POLICY IF EXISTS "event_rsvps_select_self_host_or_fellow_going"
  ON public.event_rsvps;

CREATE POLICY "event_rsvps_select_self_or_host"
  ON public.event_rsvps FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_event_host(event_id, auth.uid())
  );

-- 2. Drop has_going_rsvp (no longer referenced by any policy)
DROP FUNCTION IF EXISTS public.has_going_rsvp(UUID, UUID);

-- 3. Gated RPC for attendee-name list.
--    Internally checks the caller's authorization before returning user_ids.
--    Marked STABLE + SECURITY DEFINER so it runs as the function owner and
--    bypasses RLS on the internal SELECTs, but the function's own WHERE
--    clause re-applies the "host or fellow Going" gate explicitly.
CREATE OR REPLACE FUNCTION public.get_event_going_attendee_ids(p_event_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_allowed BOOLEAN;
BEGIN
  IF v_caller IS NULL THEN
    RETURN;
  END IF;

  -- Caller must be a host OR have their own "going" RSVP on this event.
  SELECT
    public.is_event_host(p_event_id, v_caller)
    OR EXISTS (
      SELECT 1 FROM public.event_rsvps
      WHERE event_id = p_event_id
        AND user_id = v_caller
        AND status = 'going'
    )
  INTO v_allowed;

  IF NOT v_allowed THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT user_id
    FROM public.event_rsvps
    WHERE event_id = p_event_id
      AND status = 'going'
      AND needs_reconfirm = false
    ORDER BY created_at ASC
    LIMIT 200;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_going_attendee_ids(UUID) TO authenticated;
