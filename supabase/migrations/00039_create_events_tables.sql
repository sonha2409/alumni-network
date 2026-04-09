-- =============================================================================
-- Migration 00039: Events core (F47a)
-- Tables: events, event_cohosts, event_invites, event_rsvps, event_waitlist
-- RLS, helper RPCs, and the event-covers storage bucket.
-- =============================================================================

-- =============================================================================
-- 1. Extend notification_type enum
-- =============================================================================
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'event_invite';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'event_update';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'event_cancelled';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'event_rsvp_promoted';

-- =============================================================================
-- 2. events
-- =============================================================================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location_type TEXT NOT NULL CHECK (location_type IN ('physical','virtual','hybrid')),
  address TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  virtual_url TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  event_timezone TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,
  capacity INTEGER,
  cover_image_url TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT events_title_len CHECK (char_length(title) BETWEEN 3 AND 140),
  CONSTRAINT events_desc_len CHECK (description IS NULL OR char_length(description) <= 5000),
  CONSTRAINT events_capacity_positive CHECK (capacity IS NULL OR capacity > 0),
  CONSTRAINT events_end_after_start CHECK (end_time > start_time),
  CONSTRAINT events_physical_needs_address CHECK (
    location_type = 'virtual' OR address IS NOT NULL
  ),
  CONSTRAINT events_virtual_needs_url CHECK (
    location_type = 'physical' OR virtual_url IS NOT NULL
  )
);

CREATE INDEX idx_events_creator ON public.events(creator_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_start_time ON public.events(start_time) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_public_upcoming ON public.events(start_time)
  WHERE deleted_at IS NULL AND is_public = true;

CREATE TRIGGER trigger_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 3. event_cohosts
-- =============================================================================
CREATE TABLE public.event_cohosts (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
CREATE INDEX idx_event_cohosts_user ON public.event_cohosts(user_id);

-- =============================================================================
-- 4. event_invites
-- =============================================================================
CREATE TABLE public.event_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, invitee_id)
);
CREATE INDEX idx_event_invites_invitee ON public.event_invites(invitee_id);
CREATE INDEX idx_event_invites_event ON public.event_invites(event_id);

-- =============================================================================
-- 5. event_rsvps
-- =============================================================================
CREATE TABLE public.event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('going','maybe','cant_go')),
  plus_one_name TEXT,
  plus_one_email TEXT,
  needs_reconfirm BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id),
  CONSTRAINT event_rsvps_plus_one_email_requires_name CHECK (
    plus_one_email IS NULL OR plus_one_name IS NOT NULL
  )
);
CREATE INDEX idx_event_rsvps_event_status ON public.event_rsvps(event_id, status);
CREATE INDEX idx_event_rsvps_user ON public.event_rsvps(user_id);

CREATE TRIGGER trigger_event_rsvps_updated_at
  BEFORE UPDATE ON public.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 6. event_waitlist
-- =============================================================================
CREATE TABLE public.event_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plus_one_name TEXT,
  plus_one_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
CREATE INDEX idx_event_waitlist_event_created
  ON public.event_waitlist(event_id, created_at);

-- =============================================================================
-- 7. Host helper
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_event_host(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = p_event_id AND creator_id = p_user_id AND deleted_at IS NULL
  ) OR EXISTS (
    SELECT 1 FROM public.event_cohosts
    WHERE event_id = p_event_id AND user_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_event_host(UUID, UUID) TO authenticated;

-- =============================================================================
-- 8. RLS: events
-- =============================================================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select_visible"
  ON public.events FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      is_public = true
      OR creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.event_cohosts c
        WHERE c.event_id = events.id AND c.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.event_invites i
        WHERE i.event_id = events.id AND i.invitee_id = auth.uid()
      )
    )
  );

CREATE POLICY "events_select_public_anon"
  ON public.events FOR SELECT
  TO anon
  USING (deleted_at IS NULL AND is_public = true);

CREATE POLICY "events_insert_verified_self"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (
    creator_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND verification_status = 'verified'
    )
  );

CREATE POLICY "events_update_host"
  ON public.events FOR UPDATE
  TO authenticated
  USING (public.is_event_host(id, auth.uid()))
  WITH CHECK (public.is_event_host(id, auth.uid()));

CREATE POLICY "events_delete_creator"
  ON public.events FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());

-- =============================================================================
-- 9. RLS: event_cohosts
-- =============================================================================
ALTER TABLE public.event_cohosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_cohosts_select_event_viewers"
  ON public.event_cohosts FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id)
  );

CREATE POLICY "event_cohosts_insert_creator"
  ON public.event_cohosts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND creator_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "event_cohosts_delete_creator"
  ON public.event_cohosts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_id AND creator_id = auth.uid()
    )
  );

-- =============================================================================
-- 10. RLS: event_invites
-- =============================================================================
ALTER TABLE public.event_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_invites_select_self_or_host"
  ON public.event_invites FOR SELECT
  TO authenticated
  USING (
    invitee_id = auth.uid() OR public.is_event_host(event_id, auth.uid())
  );

CREATE POLICY "event_invites_insert_host"
  ON public.event_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_event_host(event_id, auth.uid())
    AND invited_by = auth.uid()
  );

CREATE POLICY "event_invites_delete_host"
  ON public.event_invites FOR DELETE
  TO authenticated
  USING (public.is_event_host(event_id, auth.uid()));

-- =============================================================================
-- 11. RLS: event_rsvps
-- Privacy gate: viewer sees a row if they are the owner, a host, or a fellow
-- "Going" attendee.
-- =============================================================================
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "event_rsvps_insert_self_verified"
  ON public.event_rsvps FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND verification_status = 'verified'
    )
  );

CREATE POLICY "event_rsvps_update_self_or_host"
  ON public.event_rsvps FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_event_host(event_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_event_host(event_id, auth.uid()));

CREATE POLICY "event_rsvps_delete_self_or_host"
  ON public.event_rsvps FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_event_host(event_id, auth.uid()));

-- =============================================================================
-- 12. RLS: event_waitlist
-- =============================================================================
ALTER TABLE public.event_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_waitlist_select_self_or_host"
  ON public.event_waitlist FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_event_host(event_id, auth.uid()));

CREATE POLICY "event_waitlist_insert_self_verified"
  ON public.event_waitlist FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND verification_status = 'verified'
    )
  );

CREATE POLICY "event_waitlist_delete_self_or_host"
  ON public.event_waitlist FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_event_host(event_id, auth.uid()));

-- =============================================================================
-- 13. Public-count RPCs (SECURITY DEFINER)
-- Event counts are public to any viewer; names are gated by RLS above.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_event_going_count(p_event_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT FROM public.event_rsvps
  WHERE event_id = p_event_id
    AND status = 'going'
    AND needs_reconfirm = false;
$$;

CREATE OR REPLACE FUNCTION public.get_event_waitlist_count(p_event_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT FROM public.event_waitlist WHERE event_id = p_event_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_going_count(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_event_waitlist_count(UUID) TO authenticated;

-- =============================================================================
-- 14. Waitlist promotion RPC
-- Called after a Going RSVP is cancelled or when capacity increases.
-- Transactionally moves the oldest waitlisted user into event_rsvps (Going).
-- Returns the promoted user_id, or NULL if no promotion happened.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.promote_event_waitlist(p_event_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_capacity INT;
  v_going_count INT;
  v_row_id UUID;
  v_user_id UUID;
  v_plus_one_name TEXT;
  v_plus_one_email TEXT;
BEGIN
  SELECT capacity INTO v_capacity
    FROM public.events
    WHERE id = p_event_id AND deleted_at IS NULL
    FOR UPDATE;

  IF v_capacity IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*) INTO v_going_count
    FROM public.event_rsvps
    WHERE event_id = p_event_id AND status = 'going';

  IF v_going_count >= v_capacity THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_row_id
    FROM public.event_waitlist
    WHERE event_id = p_event_id
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

  IF v_row_id IS NULL THEN
    RETURN NULL;
  END IF;

  DELETE FROM public.event_waitlist
    WHERE id = v_row_id
    RETURNING user_id, plus_one_name, plus_one_email
    INTO v_user_id, v_plus_one_name, v_plus_one_email;

  INSERT INTO public.event_rsvps (event_id, user_id, status, plus_one_name, plus_one_email)
    VALUES (p_event_id, v_user_id, 'going', v_plus_one_name, v_plus_one_email)
    ON CONFLICT (event_id, user_id)
    DO UPDATE SET
      status = 'going',
      plus_one_name = EXCLUDED.plus_one_name,
      plus_one_email = EXCLUDED.plus_one_email,
      needs_reconfirm = false;

  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_event_waitlist(UUID) TO authenticated;

-- =============================================================================
-- 15. event-covers storage bucket
-- Path convention: event-covers/{user_id}/{event_id_or_uuid}.{ext}
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-covers', 'event-covers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY event_covers_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'event-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY event_covers_update ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'event-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY event_covers_select ON storage.objects
  FOR SELECT USING (bucket_id = 'event-covers');

CREATE POLICY event_covers_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'event-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
