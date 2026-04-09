-- =============================================================================
-- Migration 00040: Fix infinite-recursion in events RLS policies (F47a hotfix)
--
-- Problem:
--   events_select_visible used EXISTS subqueries on event_cohosts and
--   event_invites. event_cohosts_select_event_viewers in turn referenced
--   `events`, which re-entered the events SELECT policy — infinite recursion.
--
-- Fix:
--   1. Add SECURITY DEFINER helper is_event_invitee() alongside the existing
--      is_event_host() so invitee checks bypass RLS cleanly.
--   2. Rewrite events_select_visible to use those helpers — no cross-table
--      subqueries that can re-trigger RLS.
--   3. Simplify event_cohosts_select_event_viewers to USING (true). Co-host
--      rows are not privacy-sensitive on their own (the event row itself
--      still gates access to sensitive data), matching how group_members
--      is readable by any authenticated user.
-- =============================================================================

-- 1. Invitee helper
CREATE OR REPLACE FUNCTION public.is_event_invitee(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_invites
    WHERE event_id = p_event_id AND invitee_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_event_invitee(UUID, UUID) TO authenticated;

-- 2. Rewrite events_select_visible
DROP POLICY IF EXISTS "events_select_visible" ON public.events;

CREATE POLICY "events_select_visible"
  ON public.events FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      is_public = true
      OR creator_id = auth.uid()
      OR public.is_event_host(id, auth.uid())
      OR public.is_event_invitee(id, auth.uid())
    )
  );

-- 3. Simplify event_cohosts select policy to avoid the circular reference.
DROP POLICY IF EXISTS "event_cohosts_select_event_viewers" ON public.event_cohosts;

CREATE POLICY "event_cohosts_select_authenticated"
  ON public.event_cohosts FOR SELECT
  TO authenticated
  USING (true);
