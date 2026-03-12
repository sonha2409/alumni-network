-- Migration: Create messaging tables (conversations, messages, reports)
-- Feature: F8 Real-Time Messaging

-- =============================================================================
-- 1. Conversations table
-- =============================================================================

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  last_message_at timestamptz,
  last_message_preview text,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER handle_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 2. Conversation participants table
-- =============================================================================

CREATE TABLE public.conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  is_muted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conversation_participants_user_id
  ON public.conversation_participants(user_id);

CREATE INDEX idx_conversation_participants_conversation_id
  ON public.conversation_participants(conversation_id);

CREATE TRIGGER handle_conversation_participants_updated_at
  BEFORE UPDATE ON public.conversation_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 3. Messages table
-- =============================================================================

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) <= 5000),
  is_edited boolean NOT NULL DEFAULT false,
  edited_at timestamptz,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Primary query pattern: fetch messages in a conversation ordered by time
CREATE INDEX idx_messages_conversation_created
  ON public.messages(conversation_id, created_at DESC);

-- Rate limiting: count messages by sender in time window
CREATE INDEX idx_messages_sender_created
  ON public.messages(sender_id, created_at);

CREATE TRIGGER handle_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Sort conversations by most recent message
CREATE INDEX idx_conversations_last_message_at
  ON public.conversations(last_message_at DESC NULLS LAST);

-- =============================================================================
-- 4. Message reports table
-- =============================================================================

CREATE TABLE public.message_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (char_length(reason) <= 1000),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
  reviewed_by uuid REFERENCES public.users(id),
  reviewed_at timestamptz,
  reviewer_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, reporter_id)
);

CREATE INDEX idx_message_reports_status
  ON public.message_reports(status) WHERE status = 'pending';

CREATE TRIGGER handle_message_reports_updated_at
  BEFORE UPDATE ON public.message_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 5. Helper function: check if user is a conversation participant
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id AND user_id = uid
  );
$$;

-- =============================================================================
-- 6. RLS Policies — conversations
-- =============================================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Users can see conversations they participate in
CREATE POLICY "conversations_select_participant"
  ON public.conversations FOR SELECT
  USING (
    public.is_conversation_participant(id, auth.uid())
  );

-- Verified users can create conversations (server action validates connection)
CREATE POLICY "conversations_insert_verified"
  ON public.conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND verification_status = 'verified'
        AND is_active = true
    )
  );

-- Participants can update (soft delete, etc.)
CREATE POLICY "conversations_update_participant"
  ON public.conversations FOR UPDATE
  USING (
    public.is_conversation_participant(id, auth.uid())
  );

-- =============================================================================
-- 7. RLS Policies — conversation_participants
-- =============================================================================

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Users can see participants of conversations they're in
CREATE POLICY "conversation_participants_select"
  ON public.conversation_participants FOR SELECT
  USING (
    public.is_conversation_participant(conversation_id, auth.uid())
  );

-- Verified users can insert participants (server action controls this)
CREATE POLICY "conversation_participants_insert_verified"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND verification_status = 'verified'
        AND is_active = true
    )
  );

-- Users can update their own participant row (last_read_at, is_muted)
CREATE POLICY "conversation_participants_update_own"
  ON public.conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- =============================================================================
-- 8. RLS Policies — messages
-- =============================================================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can see messages in conversations they participate in
CREATE POLICY "messages_select_participant"
  ON public.messages FOR SELECT
  USING (
    public.is_conversation_participant(conversation_id, auth.uid())
  );

-- Participants can send messages (must be sender, conversation must be active)
CREATE POLICY "messages_insert_participant"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_conversation_participant(conversation_id, auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_id AND is_active = true
    )
  );

-- Senders can update their own messages (edit, soft-delete)
CREATE POLICY "messages_update_sender"
  ON public.messages FOR UPDATE
  USING (sender_id = auth.uid());

-- =============================================================================
-- 9. RLS Policies — message_reports
-- =============================================================================

ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;

-- Reporters can see their own reports
CREATE POLICY "message_reports_select_own"
  ON public.message_reports FOR SELECT
  USING (reporter_id = auth.uid());

-- Moderators and admins can see all reports
CREATE POLICY "message_reports_select_moderator"
  ON public.message_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

-- Verified participants can report messages (not own messages)
CREATE POLICY "message_reports_insert"
  ON public.message_reports FOR INSERT
  WITH CHECK (
    reporter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND verification_status = 'verified'
        AND is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
        AND m.sender_id != auth.uid()
        AND public.is_conversation_participant(m.conversation_id, auth.uid())
    )
  );

-- Moderators/admins can update report status
CREATE POLICY "message_reports_update_moderator"
  ON public.message_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

-- =============================================================================
-- 10. Enable Realtime for messages table
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
