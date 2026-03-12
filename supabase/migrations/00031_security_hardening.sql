-- Migration: Pre-deployment security hardening
-- Fixes 8 critical+high issues identified in architecture review (ADR-019)

-- =============================================================================
-- Fix 1: Role escalation prevention
-- Users can currently set their own role/verification_status via direct API.
-- Add WITH CHECK to prevent self-modification of privileged columns.
-- =============================================================================

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT u.role FROM public.users u WHERE u.id = auth.uid())
    AND verification_status = (SELECT u.verification_status FROM public.users u WHERE u.id = auth.uid())
  );

-- =============================================================================
-- Fix 3: Admin checks on analytics RPC functions
-- All 6 analytics functions are callable by any authenticated user.
-- Recreate with is_admin() guard. Must use plpgsql for IF/RAISE.
-- =============================================================================

-- 3a. get_user_status_counts
CREATE OR REPLACE FUNCTION get_user_status_counts()
RETURNS TABLE(status text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    verification_status::text AS status,
    COUNT(*) AS count
  FROM users
  WHERE is_active = true
  GROUP BY verification_status;
END;
$$;

-- 3b. get_signups_over_time
CREATE OR REPLACE FUNCTION get_signups_over_time(start_date date)
RETURNS TABLE(month text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    to_char(date_trunc('month', created_at), 'YYYY-MM-DD') AS month,
    COUNT(*) AS count
  FROM users
  WHERE created_at >= start_date
  GROUP BY date_trunc('month', created_at)
  ORDER BY date_trunc('month', created_at);
END;
$$;

-- 3c. get_connections_over_time
CREATE OR REPLACE FUNCTION get_connections_over_time(start_date date)
RETURNS TABLE(month text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    to_char(date_trunc('month', created_at), 'YYYY-MM-DD') AS month,
    COUNT(*) AS count
  FROM connections
  WHERE status = 'accepted'
    AND created_at >= start_date
  GROUP BY date_trunc('month', created_at)
  ORDER BY date_trunc('month', created_at);
END;
$$;

-- 3d. get_messages_over_time
CREATE OR REPLACE FUNCTION get_messages_over_time(start_date date)
RETURNS TABLE(month text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    to_char(date_trunc('month', created_at), 'YYYY-MM-DD') AS month,
    COUNT(*) AS count
  FROM messages
  WHERE created_at >= start_date
  GROUP BY date_trunc('month', created_at)
  ORDER BY date_trunc('month', created_at);
END;
$$;

-- 3e. get_top_industries
CREATE OR REPLACE FUNCTION get_top_industries(limit_count int DEFAULT 10)
RETURNS TABLE(name text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    i.name,
    COUNT(*) AS count
  FROM profiles p
  JOIN industries i ON i.id = p.primary_industry_id
  WHERE p.primary_industry_id IS NOT NULL
  GROUP BY i.name
  ORDER BY count DESC
  LIMIT limit_count;
END;
$$;

-- 3f. get_top_locations
CREATE OR REPLACE FUNCTION get_top_locations(limit_count int DEFAULT 10)
RETURNS TABLE(name text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    country AS name,
    COUNT(*) AS count
  FROM profiles
  WHERE country IS NOT NULL AND country != ''
  GROUP BY country
  ORDER BY count DESC
  LIMIT limit_count;
END;
$$;

-- =============================================================================
-- Fix 5: Duplicate conversation prevention
-- Add user_pair column with unique index to conversations table.
-- =============================================================================

ALTER TABLE public.conversations
  ADD COLUMN user_pair text;

-- Backfill existing conversations with user_pair
-- For each conversation, compute LEAST(userA, userB) || ':' || GREATEST(userA, userB)
UPDATE public.conversations c
SET user_pair = sub.computed_pair
FROM (
  SELECT
    cp.conversation_id,
    LEAST(MIN(cp.user_id::text), MAX(cp.user_id::text)) || ':' || GREATEST(MIN(cp.user_id::text), MAX(cp.user_id::text)) AS computed_pair,
    ROW_NUMBER() OVER (
      PARTITION BY LEAST(MIN(cp.user_id::text), MAX(cp.user_id::text)) || ':' || GREATEST(MIN(cp.user_id::text), MAX(cp.user_id::text))
      ORDER BY c2.created_at ASC
    ) AS rn
  FROM public.conversation_participants cp
  JOIN public.conversations c2 ON c2.id = cp.conversation_id
  GROUP BY cp.conversation_id, c2.created_at
  HAVING COUNT(*) = 2
) sub
WHERE c.id = sub.conversation_id
  AND sub.rn = 1;

CREATE UNIQUE INDEX idx_conversations_user_pair
  ON public.conversations(user_pair)
  WHERE user_pair IS NOT NULL;

-- =============================================================================
-- Fix 7: Atomic conversation creation via SECURITY DEFINER function
-- Centralizes all validation (auth, verification, blocks, connections, dedup).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_conversation_with_participant(p_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_current_user_id uuid;
  v_computed_pair text;
  v_existing_id uuid;
  v_new_id uuid;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Cannot message yourself
  IF v_current_user_id = p_other_user_id THEN
    RAISE EXCEPTION 'Cannot message yourself';
  END IF;

  -- Check current user is verified + active
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = v_current_user_id
      AND verification_status = 'verified'
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'User not verified';
  END IF;

  -- Check target user exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_other_user_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Target user not available';
  END IF;

  -- Check no blocks between users
  IF EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = v_current_user_id AND blocked_id = p_other_user_id)
       OR (blocker_id = p_other_user_id AND blocked_id = v_current_user_id)
  ) THEN
    RAISE EXCEPTION 'Unable to message this user';
  END IF;

  -- Check accepted connection exists
  IF NOT EXISTS (
    SELECT 1 FROM public.connections
    WHERE status = 'accepted'
      AND (
        (requester_id = v_current_user_id AND receiver_id = p_other_user_id)
        OR (requester_id = p_other_user_id AND receiver_id = v_current_user_id)
      )
  ) THEN
    RAISE EXCEPTION 'Not connected';
  END IF;

  -- Compute user_pair for dedup
  v_computed_pair := LEAST(v_current_user_id::text, p_other_user_id::text)
    || ':' || GREATEST(v_current_user_id::text, p_other_user_id::text);

  -- Check if conversation already exists
  SELECT id INTO v_existing_id
  FROM public.conversations
  WHERE user_pair = v_computed_pair;

  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  -- Create new conversation
  v_new_id := gen_random_uuid();

  BEGIN
    INSERT INTO public.conversations (id, user_pair)
    VALUES (v_new_id, v_computed_pair);
  EXCEPTION
    WHEN unique_violation THEN
      -- Race condition: another request created it first
      SELECT id INTO v_new_id
      FROM public.conversations
      WHERE user_pair = v_computed_pair;
      RETURN v_new_id;
  END;

  -- Add both participants
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (v_new_id, v_current_user_id), (v_new_id, p_other_user_id);

  RETURN v_new_id;
END;
$$;

-- Drop the direct INSERT policy on conversation_participants
-- Creation now goes through the SECURITY DEFINER function
DROP POLICY IF EXISTS "conversation_participants_insert_verified" ON public.conversation_participants;
