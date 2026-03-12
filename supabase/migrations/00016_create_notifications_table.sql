-- =============================================================================
-- Migration 00016: Create notifications table
-- Feature #21: In-app notifications
-- =============================================================================

-- Notification type enum
CREATE TYPE notification_type AS ENUM (
  'connection_request',
  'connection_accepted',
  'new_message',
  'verification_update',
  'announcement'
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for notification feed queries
CREATE INDEX idx_notifications_user_unread
  ON notifications (user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

-- updated_at trigger (reuses existing handle_updated_at function)
CREATE TRIGGER set_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- Row-Level Security
-- =============================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update (mark read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- No INSERT policy for regular users — notifications are created
-- via a SECURITY DEFINER function to prevent fake notifications.

-- =============================================================================
-- Notification creation function (SECURITY DEFINER)
-- =============================================================================

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_body TEXT,
  p_link TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, body, link)
  VALUES (p_user_id, p_type, p_title, p_body, p_link)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- =============================================================================
-- Enable Realtime
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
