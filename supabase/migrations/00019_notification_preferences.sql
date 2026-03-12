-- =============================================================================
-- Migration 00019: Notification Preferences
-- =============================================================================
-- Allows users to opt out of email notifications per notification type.
-- Absence of a row = email enabled (default). Row with email_enabled=false = opted out.
-- =============================================================================

-- Create notification_preferences table
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

-- Index for fast lookups by user
CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);

-- updated_at trigger (function already exists from migration 00001)
CREATE TRIGGER set_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- RLS Policies
-- =============================================================================
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own preferences
CREATE POLICY "Users can read own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own preferences (reset to default)
CREATE POLICY "Users can delete own notification preferences"
  ON notification_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================================================
-- SECURITY DEFINER function for unsubscribe (no auth context needed)
-- =============================================================================
CREATE OR REPLACE FUNCTION unsubscribe_email_notification(
  p_user_id UUID,
  p_type notification_type
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notification_preferences (user_id, notification_type, email_enabled)
  VALUES (p_user_id, p_type, false)
  ON CONFLICT (user_id, notification_type)
  DO UPDATE SET email_enabled = false;
END;
$$;
