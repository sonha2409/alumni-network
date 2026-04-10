-- F47e: Day-of QR check-in
-- event_checkins table + RLS + checkin_user() SECURITY DEFINER RPC

-- 1. Table
CREATE TABLE public.event_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- 2. RLS
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;

-- Hosts see all checkins for their events
CREATE POLICY "event_checkins_select_host" ON public.event_checkins
  FOR SELECT USING (public.is_event_host(event_id, auth.uid()));

-- Users see own checkin
CREATE POLICY "event_checkins_select_own" ON public.event_checkins
  FOR SELECT USING (user_id = auth.uid());

-- No direct INSERT/UPDATE/DELETE — use SECURITY DEFINER function

-- 3. updated_at trigger
CREATE TRIGGER handle_event_checkins_updated_at
  BEFORE UPDATE ON public.event_checkins
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. Index for host page queries
CREATE INDEX idx_event_checkins_event_id ON public.event_checkins(event_id);

-- 5. SECURITY DEFINER RPC: checkin_user
-- Token verification happens in the server action (needs env var secret).
-- This function handles the DB-side checks and insert.
CREATE OR REPLACE FUNCTION public.checkin_user(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_event RECORD;
  v_has_going_rsvp BOOLEAN;
  v_already_checked_in BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Check event exists and is active
  SELECT start_time, end_time INTO v_event
  FROM events WHERE id = p_event_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_found');
  END IF;

  -- Check time window [start - 2h, end + 2h]
  IF now() < v_event.start_time - interval '2 hours'
     OR now() > v_event.end_time + interval '2 hours' THEN
    RETURN jsonb_build_object('success', false, 'error', 'outside_time_window');
  END IF;

  -- Check Going RSVP
  SELECT EXISTS(
    SELECT 1 FROM event_rsvps
    WHERE event_id = p_event_id AND user_id = v_user_id AND status = 'going'
  ) INTO v_has_going_rsvp;

  IF NOT v_has_going_rsvp THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_going_rsvp');
  END IF;

  -- Check if already checked in
  SELECT EXISTS(
    SELECT 1 FROM event_checkins
    WHERE event_id = p_event_id AND user_id = v_user_id
  ) INTO v_already_checked_in;

  IF v_already_checked_in THEN
    RETURN jsonb_build_object('success', true, 'already_checked_in', true);
  END IF;

  -- Insert checkin
  INSERT INTO event_checkins (event_id, user_id)
  VALUES (p_event_id, v_user_id);

  RETURN jsonb_build_object('success', true, 'already_checked_in', false);
END;
$$;

-- 6. RPC: get_event_checkin_count (public for detail page)
CREATE OR REPLACE FUNCTION public.get_event_checkin_count(p_event_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer FROM event_checkins WHERE event_id = p_event_id;
$$;

-- 7. Enable realtime for live check-in updates on host page
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_checkins;
