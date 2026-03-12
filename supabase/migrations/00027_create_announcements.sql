-- =============================================================================
-- Feature #30: Announcements — platform-wide admin notices
-- =============================================================================

-- Announcements table
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dismissed announcements (tracks per-user dismissals)
CREATE TABLE dismissed_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, announcement_id)
);

-- Indexes
CREATE INDEX idx_announcements_active ON announcements (is_active, published_at DESC);
CREATE INDEX idx_dismissed_user ON dismissed_announcements (user_id, announcement_id);

-- updated_at trigger (handle_updated_at already defined in earlier migration)
CREATE TRIGGER set_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- RLS policies
-- =============================================================================

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE dismissed_announcements ENABLE ROW LEVEL SECURITY;

-- Announcements: authenticated users can read active, published ones
CREATE POLICY "Authenticated users can view active announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (is_active = true AND published_at <= now());

-- Admins can do everything (CRUD)
CREATE POLICY "Admins can manage announcements"
  ON announcements FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Dismissed: users can read their own dismissals
CREATE POLICY "Users can view own dismissals"
  ON dismissed_announcements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Dismissed: users can insert their own dismissals
CREATE POLICY "Users can dismiss announcements"
  ON dismissed_announcements FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- Extend admin_audit_log action CHECK to include announcement actions
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
    'bulk_invite', 'resend_invite',
    'create_announcement', 'update_announcement',
    'toggle_announcement', 'delete_announcement'
  ));
