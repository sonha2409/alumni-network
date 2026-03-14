-- P9: Add missing indexes identified in FEATURES.md Post-Launch Hardening
-- These support bulk mark-all-read, reporter history, announcement dismissals, and moderator action history.

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_message_reports_reporter
  ON message_reports(reporter_id);

CREATE INDEX IF NOT EXISTS idx_dismissed_announcements_user
  ON dismissed_announcements(user_id);

CREATE INDEX IF NOT EXISTS idx_user_warnings_moderator
  ON user_warnings(moderator_id);
