-- Migration 00053: Add admin SELECT policies for event-related tables.
-- Admin needs to see RSVPs, waitlist, co-hosts, and comments to manage events.

-- event_rsvps: admin can see all RSVPs
CREATE POLICY "event_rsvps_select_admin"
  ON public.event_rsvps FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- event_waitlist: admin can see all waitlist entries
CREATE POLICY "event_waitlist_select_admin"
  ON public.event_waitlist FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- event_cohosts: admin can see all co-hosts
CREATE POLICY "event_cohosts_select_admin"
  ON public.event_cohosts FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- event_comments: admin can see all comments (including soft-deleted for moderation)
CREATE POLICY "event_comments_select_admin"
  ON public.event_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- events: admin can see all events including soft-deleted (cancelled)
-- The existing events_select_public policy filters deleted_at IS NULL.
-- Admin needs to see cancelled events too.
CREATE POLICY "events_select_admin"
  ON public.events FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- events: admin can update events (for cancellation via deleted_at)
CREATE POLICY "events_update_admin"
  ON public.events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
