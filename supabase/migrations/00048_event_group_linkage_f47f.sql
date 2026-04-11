-- F47f: Event–group linkage + bulk-invite members

-- 1. Add group_id FK to events
ALTER TABLE public.events
  ADD COLUMN group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;

CREATE INDEX idx_events_group_id ON public.events(group_id);

-- 2. RLS: group members can see group-linked events (even private ones)
CREATE POLICY "events_select_group_member" ON public.events
  FOR SELECT USING (
    group_id IS NOT NULL
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = events.group_id
        AND group_members.user_id = auth.uid()
    )
  );

-- 3. Bulk-invite rate-limit log
CREATE TABLE public.group_bulk_invite_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  member_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.group_bulk_invite_log ENABLE ROW LEVEL SECURITY;

-- Inviter can see their own logs; admins see all
CREATE POLICY "bulk_invite_log_select_own_or_admin" ON public.group_bulk_invite_log
  FOR SELECT USING (
    invited_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- No direct INSERT — done via server action with service-level trust
-- The server action runs as the authenticated user, so we need an INSERT policy
CREATE POLICY "bulk_invite_log_insert_own" ON public.group_bulk_invite_log
  FOR INSERT WITH CHECK (invited_by = auth.uid());

CREATE INDEX idx_bulk_invite_log_group_id ON public.group_bulk_invite_log(group_id);
CREATE INDEX idx_bulk_invite_log_created_at ON public.group_bulk_invite_log(created_at);
