-- Migration: event_moderation_actions table + event_cancelled_by_admin notification type
-- Supports admin event moderation (cancel with reason, extensible to flag/warn/reinstate)

-- 1. Add new notification type
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'event_cancelled_by_admin';

-- 2. Add new admin action type
-- (admin_audit_log.action is text, so no enum change needed — just add to TS types)

-- 3. Create event_moderation_actions table
CREATE TABLE event_moderation_actions (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  admin_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action      text NOT NULL CHECK (action IN ('cancel', 'flag', 'warn', 'reinstate')),
  reason      text NOT NULL CHECK (char_length(reason) >= 10 AND char_length(reason) <= 1000),
  details     jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_event_moderation_actions_event_id ON event_moderation_actions(event_id);
CREATE INDEX idx_event_moderation_actions_admin_id ON event_moderation_actions(admin_id);

-- 4. RLS
ALTER TABLE event_moderation_actions ENABLE ROW LEVEL SECURITY;

-- Admin can read all moderation actions
CREATE POLICY event_moderation_actions_select_admin ON event_moderation_actions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can insert moderation actions
CREATE POLICY event_moderation_actions_insert_admin ON event_moderation_actions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Event creator can see moderation actions on their own events (so they can see why it was cancelled)
CREATE POLICY event_moderation_actions_select_creator ON event_moderation_actions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM events WHERE id = event_id AND creator_id = auth.uid())
  );
