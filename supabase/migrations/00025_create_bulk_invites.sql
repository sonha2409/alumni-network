-- =============================================================================
-- Migration 00025: Create bulk_invites table
-- Tracks alumni invited via admin CSV upload
-- =============================================================================

CREATE TABLE bulk_invites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL,
  name text,
  graduation_year integer,
  invited_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'signed_up', 'verified')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  signed_up_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate invites for the same email
CREATE UNIQUE INDEX bulk_invites_email_unique ON bulk_invites(email);

-- Query indexes
CREATE INDEX bulk_invites_invited_by_idx ON bulk_invites(invited_by);
CREATE INDEX bulk_invites_status_idx ON bulk_invites(status);

-- Auto-update updated_at
CREATE TRIGGER on_bulk_invites_updated
  BEFORE UPDATE ON bulk_invites
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- RLS: admin-only access
-- =============================================================================

ALTER TABLE bulk_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert invites" ON bulk_invites
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin' AND is_active = true
    )
  );

CREATE POLICY "Admins can view all invites" ON bulk_invites
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin' AND is_active = true
    )
  );

CREATE POLICY "Admins can update invites" ON bulk_invites
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin' AND is_active = true
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin' AND is_active = true
    )
  );

-- =============================================================================
-- Extend admin_audit_log action CHECK to include bulk invite actions
-- =============================================================================

ALTER TABLE admin_audit_log DROP CONSTRAINT admin_audit_log_action_check;
ALTER TABLE admin_audit_log ADD CONSTRAINT admin_audit_log_action_check
  CHECK (action IN (
    'verify', 'ban', 'unban', 'suspend', 'unsuspend',
    'promote', 'demote', 'delete',
    'taxonomy_create_industry', 'taxonomy_update_industry',
    'taxonomy_archive_industry', 'taxonomy_restore_industry',
    'taxonomy_create_specialization', 'taxonomy_update_specialization',
    'taxonomy_archive_specialization', 'taxonomy_restore_specialization',
    'bulk_invite', 'resend_invite'
  ));

-- =============================================================================
-- Auto-update invite status when a user signs up with an invited email
-- =============================================================================

CREATE OR REPLACE FUNCTION update_bulk_invite_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE bulk_invites
  SET status = 'signed_up',
      signed_up_at = now()
  WHERE email = NEW.email
    AND status = 'invited';
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_signup_update_invite
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_bulk_invite_on_signup();
