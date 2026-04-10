-- =============================================================================
-- Migration 00046: Event comments (F47c)
-- Tables: event_comments, event_comment_reports
-- Flat append-only comment thread per event with moderation integration.
-- =============================================================================

-- =============================================================================
-- 1. Extend notification_type enum
-- =============================================================================
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'event_comment';

-- =============================================================================
-- 2. event_comments
-- =============================================================================
CREATE TABLE public.event_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT event_comments_body_len CHECK (char_length(body) BETWEEN 1 AND 2000)
);

CREATE INDEX idx_event_comments_event_chrono
  ON public.event_comments(event_id, created_at ASC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_event_comments_user
  ON public.event_comments(user_id);

CREATE TRIGGER trigger_event_comments_updated_at
  BEFORE UPDATE ON public.event_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 3. event_comments RLS
-- =============================================================================
ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user can read comments on non-deleted events
CREATE POLICY event_comments_select
  ON public.event_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_comments.event_id
        AND e.deleted_at IS NULL
    )
  );

-- INSERT: verified + not muted + event not deleted
CREATE POLICY event_comments_insert
  ON public.event_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.verification_status = 'verified'
        AND (u.muted_until IS NULL OR u.muted_until < now())
    )
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_comments.event_id
        AND e.deleted_at IS NULL
    )
  );

-- UPDATE: own comments only (for soft-delete)
CREATE POLICY event_comments_update_own
  ON public.event_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 4. SECURITY DEFINER: moderator soft-delete comment
-- =============================================================================
CREATE OR REPLACE FUNCTION public.moderate_delete_event_comment(p_comment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_moderator() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE event_comments
  SET deleted_at = now()
  WHERE id = p_comment_id AND deleted_at IS NULL;
END;
$$;

-- =============================================================================
-- 5. event_comment_reports
-- =============================================================================
CREATE TABLE public.event_comment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.event_comments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (char_length(reason) <= 1000),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed', 'escalated')),
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comment_id, reporter_id)
);

CREATE INDEX idx_event_comment_reports_status
  ON public.event_comment_reports(status)
  WHERE status IN ('pending', 'escalated');

CREATE INDEX idx_event_comment_reports_reporter
  ON public.event_comment_reports(reporter_id);

CREATE TRIGGER trigger_event_comment_reports_updated_at
  BEFORE UPDATE ON public.event_comment_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 6. event_comment_reports RLS
-- =============================================================================
ALTER TABLE public.event_comment_reports ENABLE ROW LEVEL SECURITY;

-- Reporters can insert their own reports
CREATE POLICY event_comment_reports_insert
  ON public.event_comment_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reporter_id
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.verification_status = 'verified'
    )
  );

-- Moderators and admins can read all reports
CREATE POLICY event_comment_reports_select_mod
  ON public.event_comment_reports FOR SELECT
  TO authenticated
  USING (public.is_moderator());

-- Reporters can see their own reports
CREATE POLICY event_comment_reports_select_own
  ON public.event_comment_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Moderators and admins can update reports
CREATE POLICY event_comment_reports_update_mod
  ON public.event_comment_reports FOR UPDATE
  TO authenticated
  USING (public.is_moderator())
  WITH CHECK (public.is_moderator());
