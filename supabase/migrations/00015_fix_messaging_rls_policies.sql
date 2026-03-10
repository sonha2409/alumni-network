-- Migration: Fix messaging RLS policies that subquery public.users
-- Problem: INSERT/SELECT policies on messaging tables do
--   `EXISTS (SELECT 1 FROM public.users WHERE ...)` — but public.users has RLS,
--   so the subquery itself is subject to RLS evaluation, causing permission failures.
-- Fix: SECURITY DEFINER helper functions that bypass RLS on public.users.

-- =============================================================================
-- 1. Helper: is_verified_user() — checks if current user is verified + active
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_verified_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND verification_status = 'verified'
      AND is_active = true
  );
$$;

-- =============================================================================
-- 2. Helper: is_moderator_or_admin() — for report access
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_moderator_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role IN ('moderator', 'admin')
  );
$$;

-- =============================================================================
-- 3. Fix conversations policies
-- =============================================================================

DROP POLICY IF EXISTS "conversations_insert_verified" ON public.conversations;
CREATE POLICY "conversations_insert_verified"
  ON public.conversations FOR INSERT
  WITH CHECK (public.is_verified_user());

-- =============================================================================
-- 4. Fix conversation_participants policies
-- =============================================================================

DROP POLICY IF EXISTS "conversation_participants_insert_verified" ON public.conversation_participants;
CREATE POLICY "conversation_participants_insert_verified"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (public.is_verified_user());

-- =============================================================================
-- 5. Fix messages policies
-- =============================================================================

DROP POLICY IF EXISTS "messages_insert_participant" ON public.messages;
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

-- =============================================================================
-- 6. Fix message_reports policies
-- =============================================================================

DROP POLICY IF EXISTS "message_reports_select_moderator" ON public.message_reports;
CREATE POLICY "message_reports_select_moderator"
  ON public.message_reports FOR SELECT
  USING (public.is_moderator_or_admin());

DROP POLICY IF EXISTS "message_reports_insert" ON public.message_reports;
CREATE POLICY "message_reports_insert"
  ON public.message_reports FOR INSERT
  WITH CHECK (
    reporter_id = auth.uid()
    AND public.is_verified_user()
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
        AND m.sender_id != auth.uid()
        AND public.is_conversation_participant(m.conversation_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "message_reports_update_moderator" ON public.message_reports;
CREATE POLICY "message_reports_update_moderator"
  ON public.message_reports FOR UPDATE
  USING (public.is_moderator_or_admin());
