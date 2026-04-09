-- =============================================================================
-- Migration 00042: Convert has_going_rsvp() from SQL to plpgsql
--
-- Problem:
--   LANGUAGE SQL STABLE functions can be *inlined* by the Postgres planner,
--   which causes the SECURITY DEFINER attribute to be lost. When the
--   event_rsvps SELECT policy inlines has_going_rsvp(), the body runs under
--   the caller's privileges, re-triggers the same SELECT policy, and
--   Postgres reports "infinite recursion detected in policy for relation
--   event_rsvps".
--
-- Fix:
--   Rewrite has_going_rsvp() as LANGUAGE plpgsql. plpgsql functions are
--   never inlined, so SECURITY DEFINER is preserved at runtime and the
--   inner SELECT bypasses RLS as intended.
-- =============================================================================

-- Drop the dependent policy first so we can replace the function.
DROP POLICY IF EXISTS "event_rsvps_select_self_host_or_fellow_going"
  ON public.event_rsvps;

DROP FUNCTION IF EXISTS public.has_going_rsvp(UUID, UUID);

CREATE OR REPLACE FUNCTION public.has_going_rsvp(
  p_event_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.event_rsvps
    WHERE event_id = p_event_id
      AND user_id = p_user_id
      AND status = 'going'
  ) INTO v_exists;
  RETURN v_exists;
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_going_rsvp(UUID, UUID) TO authenticated;

-- Recreate the policy with the new plpgsql-backed helper.
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
