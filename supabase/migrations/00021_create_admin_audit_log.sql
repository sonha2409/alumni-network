-- Migration: Admin audit log + user suspension/ban fields
-- Supports Feature #25: Admin Dashboard — User Management

-- =============================================================================
-- Add suspension/ban columns to users table
-- =============================================================================

ALTER TABLE public.users ADD COLUMN suspended_until timestamptz;
ALTER TABLE public.users ADD COLUMN ban_reason text;

-- Index for finding suspended users
CREATE INDEX idx_users_suspended_until ON public.users(suspended_until)
  WHERE suspended_until IS NOT NULL;

-- =============================================================================
-- Admin audit log table
-- =============================================================================

CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.users(id),
  target_user_id uuid NOT NULL REFERENCES public.users(id),
  action text NOT NULL CHECK (action IN (
    'verify', 'ban', 'unban', 'suspend', 'unsuspend',
    'promote', 'demote', 'delete'
  )),
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_audit_log_target_user_id ON public.admin_audit_log(target_user_id);
CREATE INDEX idx_audit_log_admin_id ON public.admin_audit_log(admin_id);
CREATE INDEX idx_audit_log_created_at ON public.admin_audit_log(created_at DESC);

-- =============================================================================
-- Row-Level Security
-- =============================================================================

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "audit_log_admin_select"
  ON public.admin_audit_log FOR SELECT
  USING (public.is_admin());

-- Insert via SECURITY DEFINER function (server actions use this)
CREATE OR REPLACE FUNCTION public.insert_audit_log(
  p_admin_id uuid,
  p_target_user_id uuid,
  p_action text,
  p_details jsonb DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.admin_audit_log (admin_id, target_user_id, action, details)
  VALUES (p_admin_id, p_target_user_id, p_action, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
