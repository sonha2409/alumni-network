-- =============================================================================
-- Migration 00028: Moderation system
-- Features #31-32: Moderator report queue + limited user actions (warn/mute)
-- =============================================================================

-- =============================================================================
-- 1. Add mute columns to users table
-- =============================================================================

ALTER TABLE public.users ADD COLUMN muted_until timestamptz;
ALTER TABLE public.users ADD COLUMN muted_reason text;

-- Index for finding muted users
CREATE INDEX idx_users_muted_until ON public.users(muted_until)
  WHERE muted_until IS NOT NULL;

-- =============================================================================
-- 2. Add notification types for moderation
-- =============================================================================

ALTER TYPE public.notification_type ADD VALUE 'user_warning';
ALTER TYPE public.notification_type ADD VALUE 'user_muted';

-- =============================================================================
-- 3. Add 'escalated' status to message_reports
-- =============================================================================

-- Drop and re-create the CHECK constraint to add 'escalated'
ALTER TABLE public.message_reports
  DROP CONSTRAINT IF EXISTS message_reports_status_check;

ALTER TABLE public.message_reports
  ADD CONSTRAINT message_reports_status_check
  CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed', 'escalated'));

-- =============================================================================
-- 4. Add moderator actions to audit_log CHECK constraint
-- =============================================================================

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_action_check;

ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_action_check
  CHECK (action IN (
    'verify', 'ban', 'unban', 'suspend', 'unsuspend',
    'promote', 'demote', 'delete',
    'taxonomy_create_industry', 'taxonomy_update_industry',
    'taxonomy_archive_industry', 'taxonomy_restore_industry',
    'taxonomy_create_specialization', 'taxonomy_update_specialization',
    'taxonomy_archive_specialization', 'taxonomy_restore_specialization',
    'bulk_invite', 'resend_invite',
    'create_announcement', 'update_announcement',
    'toggle_announcement', 'delete_announcement',
    'warn', 'mute', 'unmute',
    'dismiss_report', 'escalate_report'
  ));

-- =============================================================================
-- 5. User warnings table (persistent record)
-- =============================================================================

CREATE TABLE public.user_warnings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  moderator_id uuid NOT NULL REFERENCES public.users(id),
  report_id uuid REFERENCES public.message_reports(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_warnings_user_id ON public.user_warnings(user_id);
CREATE INDEX idx_user_warnings_created_at ON public.user_warnings(created_at DESC);

-- =============================================================================
-- 6. is_moderator() helper function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('moderator', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================================
-- 7. RLS for user_warnings
-- =============================================================================

ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

-- Moderators and admins can view all warnings
CREATE POLICY "user_warnings_moderator_select"
  ON public.user_warnings FOR SELECT
  USING (public.is_moderator());

-- Insert via server actions (SECURITY DEFINER functions or service role)
-- No direct insert policy — use insert_user_warning() function

-- =============================================================================
-- 8. SECURITY DEFINER function to insert warnings
-- =============================================================================

CREATE OR REPLACE FUNCTION public.insert_user_warning(
  p_user_id uuid,
  p_moderator_id uuid,
  p_report_id uuid,
  p_reason text
)
RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.user_warnings (user_id, moderator_id, report_id, reason)
  VALUES (p_user_id, p_moderator_id, p_report_id, p_reason)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 9. Update audit_log RLS to allow moderators to read
-- =============================================================================

-- Drop old admin-only policy and create one that includes moderators
DROP POLICY IF EXISTS "audit_log_admin_select" ON public.admin_audit_log;

CREATE POLICY "audit_log_moderator_select"
  ON public.admin_audit_log FOR SELECT
  USING (public.is_moderator());

-- =============================================================================
-- 10. SECURITY DEFINER function to mute/unmute users
-- (Moderators can't update other users' rows via RLS, so we use a function)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.mute_user(
  p_user_id uuid,
  p_muted_until timestamptz,
  p_muted_reason text
)
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET muted_until = p_muted_until,
      muted_reason = p_muted_reason
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.unmute_user(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET muted_until = NULL,
      muted_reason = NULL
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 11. Allow moderators/admins to read messages for moderation
-- =============================================================================

-- Moderators and admins can read any message (needed for report review
-- and conversation context in the moderation queue).
CREATE POLICY "messages_select_moderator"
  ON public.messages FOR SELECT
  USING (public.is_moderator());
