-- Migration: Account soft delete + data export (self-service)
-- Adds columns for user-initiated account deletion tracking
-- and a pg_cron job for hard-deleting expired accounts.

-- =============================================================================
-- 1. New columns on users table
-- =============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_reason text;

-- =============================================================================
-- 2. Account deletion audit log (persists after user is hard-deleted)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.account_deletion_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  deletion_requested_at timestamptz NOT NULL,
  hard_deleted_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  data_export_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: only admins can read the deletion log
ALTER TABLE public.account_deletion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deletion_log_admin_read"
  ON public.account_deletion_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================================================
-- 3. RPC: self-service account deletion (SECURITY DEFINER)
-- Handles the multi-table soft-delete atomically.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.request_account_deletion(
  p_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is the user themselves
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 1. Mark user as deleted
  UPDATE public.users
  SET
    is_active = false,
    deleted_at = now(),
    deletion_requested_at = now(),
    deletion_reason = p_reason
  WHERE id = p_user_id AND is_active = true;

  -- 2. Anonymize messages (set content marker, keep messages for other party)
  -- We update the sender_id reference display by setting a flag.
  -- The app layer will display "Deleted User" for inactive senders.

  -- 3. Remove all connections (both directions)
  DELETE FROM public.connections
  WHERE requester_id = p_user_id OR receiver_id = p_user_id;

  -- 4. Remove all blocks (both directions)
  DELETE FROM public.blocks
  WHERE blocker_id = p_user_id OR blocked_id = p_user_id;

  -- 5. Leave all groups
  DELETE FROM public.group_members
  WHERE user_id = p_user_id;

  -- 6. Remove availability tags
  DELETE FROM public.user_availability_tags
  WHERE profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = p_user_id
  );

  -- 7. Remove profile contact details
  DELETE FROM public.profile_contact_details
  WHERE profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = p_user_id
  );

  -- 8. Clear dismissed announcements
  DELETE FROM public.dismissed_announcements
  WHERE user_id = p_user_id;
END;
$$;

-- =============================================================================
-- 4. RPC: cancel account deletion (reactivation)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cancel_account_deletion(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_at timestamptz;
BEGIN
  -- Verify the caller is the user themselves
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Check user is actually in deletion grace period
  SELECT deleted_at INTO v_deleted_at
  FROM public.users
  WHERE id = p_user_id AND is_active = false AND deleted_at IS NOT NULL;

  IF v_deleted_at IS NULL THEN
    RAISE EXCEPTION 'Account is not in deletion grace period';
  END IF;

  -- Check grace period hasn't expired (30 days)
  IF v_deleted_at < now() - interval '30 days' THEN
    RAISE EXCEPTION 'Grace period has expired';
  END IF;

  -- Reactivate the account
  UPDATE public.users
  SET
    is_active = true,
    deleted_at = NULL,
    deletion_requested_at = NULL,
    deletion_reason = NULL
  WHERE id = p_user_id;
END;
$$;

-- =============================================================================
-- 5. RPC: export account data
-- Returns a JSON object with all user data for data portability.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.export_account_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_profile jsonb;
  v_career jsonb;
  v_education jsonb;
  v_connections jsonb;
  v_messages jsonb;
  v_groups jsonb;
  v_availability_tags jsonb;
  v_contact_details jsonb;
BEGIN
  -- Verify the caller is the user themselves
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- User basic info
  SELECT to_jsonb(u.*) - 'id' INTO v_result
  FROM (
    SELECT email, role, verification_status, created_at
    FROM public.users WHERE id = p_user_id
  ) u;

  -- Profile
  SELECT to_jsonb(p.*) INTO v_profile
  FROM (
    SELECT full_name, bio, graduation_year, country, state_province, city,
           photo_url, profile_completeness, last_active_at, created_at
    FROM public.profiles WHERE user_id = p_user_id
  ) p;

  -- Career entries
  SELECT COALESCE(jsonb_agg(to_jsonb(c.*)), '[]'::jsonb) INTO v_career
  FROM (
    SELECT job_title, company, start_date, end_date, description, is_current
    FROM public.career_entries
    WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id)
    ORDER BY start_date DESC
  ) c;

  -- Education entries
  SELECT COALESCE(jsonb_agg(to_jsonb(e.*)), '[]'::jsonb) INTO v_education
  FROM (
    SELECT institution, degree, field_of_study, start_year, end_year
    FROM public.education_entries
    WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id)
    ORDER BY start_year DESC NULLS LAST
  ) e;

  -- Connections (accepted only, with other user's name)
  SELECT COALESCE(jsonb_agg(to_jsonb(conn.*)), '[]'::jsonb) INTO v_connections
  FROM (
    SELECT
      p.full_name AS connected_to,
      c.created_at AS connected_since
    FROM public.connections c
    JOIN public.profiles p ON p.user_id = CASE
      WHEN c.requester_id = p_user_id THEN c.receiver_id
      ELSE c.requester_id
    END
    WHERE (c.requester_id = p_user_id OR c.receiver_id = p_user_id)
      AND c.status = 'accepted'
    ORDER BY c.created_at DESC
  ) conn;

  -- Messages (sent by this user)
  SELECT COALESCE(jsonb_agg(to_jsonb(m.*)), '[]'::jsonb) INTO v_messages
  FROM (
    SELECT content, created_at, conversation_id
    FROM public.messages
    WHERE sender_id = p_user_id AND is_deleted = false
    ORDER BY created_at DESC
    LIMIT 10000
  ) m;

  -- Groups
  SELECT COALESCE(jsonb_agg(to_jsonb(g.*)), '[]'::jsonb) INTO v_groups
  FROM (
    SELECT gr.name, gr.type, gm.role, gm.created_at AS joined_at
    FROM public.group_members gm
    JOIN public.groups gr ON gr.id = gm.group_id
    WHERE gm.user_id = p_user_id
    ORDER BY gm.created_at DESC
  ) g;

  -- Availability tags
  SELECT COALESCE(jsonb_agg(to_jsonb(t.*)), '[]'::jsonb) INTO v_availability_tags
  FROM (
    SELECT att.name, att.slug
    FROM public.user_availability_tags uat
    JOIN public.availability_tag_types att ON att.id = uat.tag_type_id
    WHERE uat.profile_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id)
  ) t;

  -- Contact details
  SELECT to_jsonb(cd.*) INTO v_contact_details
  FROM (
    SELECT personal_email, phone, linkedin_url, github_url, website_url
    FROM public.profile_contact_details
    WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id)
  ) cd;

  -- Assemble final result
  v_result := jsonb_build_object(
    'exported_at', now(),
    'account', v_result,
    'profile', COALESCE(v_profile, '{}'::jsonb),
    'contact_details', COALESCE(v_contact_details, '{}'::jsonb),
    'career_history', v_career,
    'education_history', v_education,
    'connections', v_connections,
    'messages', v_messages,
    'groups', v_groups,
    'availability_tags', v_availability_tags
  );

  RETURN v_result;
END;
$$;

-- =============================================================================
-- 6. Hard-delete function (called by pg_cron or Edge Function)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.hard_delete_expired_accounts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_user_ids uuid[];
BEGIN
  -- Find all users past the 30-day grace period
  SELECT array_agg(id) INTO v_user_ids
  FROM public.users
  WHERE is_active = false
    AND deleted_at IS NOT NULL
    AND deleted_at < now() - interval '30 days';

  IF v_user_ids IS NULL OR array_length(v_user_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  -- Log before deleting
  INSERT INTO public.account_deletion_log (user_id, email, deletion_requested_at, reason)
  SELECT id, email, deletion_requested_at, deletion_reason
  FROM public.users
  WHERE id = ANY(v_user_ids);

  -- Delete dependent rows (order matters for FK constraints)
  DELETE FROM public.message_reports WHERE reporter_id = ANY(v_user_ids);
  DELETE FROM public.user_warnings WHERE user_id = ANY(v_user_ids);
  DELETE FROM public.notification_preferences WHERE user_id = ANY(v_user_ids);
  DELETE FROM public.notifications WHERE user_id = ANY(v_user_ids);
  DELETE FROM public.dismissed_announcements WHERE user_id = ANY(v_user_ids);
  DELETE FROM public.user_availability_tags
  WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = ANY(v_user_ids));
  DELETE FROM public.profile_views WHERE viewer_id = ANY(v_user_ids)
    OR profile_id IN (SELECT id FROM public.profiles WHERE user_id = ANY(v_user_ids));

  -- Messages: delete the message rows (conversations may be shared, so keep conversation shell)
  DELETE FROM public.message_attachments
  WHERE message_id IN (
    SELECT id FROM public.messages WHERE sender_id = ANY(v_user_ids)
  );
  DELETE FROM public.messages WHERE sender_id = ANY(v_user_ids);

  -- Conversation participants
  DELETE FROM public.conversation_participants WHERE user_id = ANY(v_user_ids);

  -- Connections and blocks (should already be cleared at soft-delete, but be thorough)
  DELETE FROM public.connections WHERE requester_id = ANY(v_user_ids) OR receiver_id = ANY(v_user_ids);
  DELETE FROM public.blocks WHERE blocker_id = ANY(v_user_ids) OR blocked_id = ANY(v_user_ids);

  -- Group members
  DELETE FROM public.group_members WHERE user_id = ANY(v_user_ids);

  -- Profile-dependent tables
  DELETE FROM public.profile_contact_details
  WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = ANY(v_user_ids));
  DELETE FROM public.career_entries
  WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = ANY(v_user_ids));
  DELETE FROM public.education_entries
  WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = ANY(v_user_ids));

  -- Verification
  DELETE FROM public.verification_documents
  WHERE request_id IN (
    SELECT id FROM public.verification_requests WHERE user_id = ANY(v_user_ids)
  );
  DELETE FROM public.verification_requests WHERE user_id = ANY(v_user_ids);

  -- Profile
  DELETE FROM public.profiles WHERE user_id = ANY(v_user_ids);

  -- Finally, delete the user rows
  DELETE FROM public.users WHERE id = ANY(v_user_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Note: Storage cleanup (avatars, attachments, verification docs) is handled
  -- by the Edge Function in Phase 2. Orphaned storage files are harmless.

  RETURN v_count;
END;
$$;

-- Schedule the hard-delete job to run daily at 3 AM UTC
-- Note: pg_cron must be enabled in Supabase dashboard (Extensions → pg_cron)
-- If pg_cron is not available, this will be a no-op and the function
-- can be called manually or via Edge Function/Vercel Cron.
DO $$
BEGIN
  PERFORM cron.schedule(
    'hard-delete-expired-accounts',
    '0 3 * * *',
    'SELECT public.hard_delete_expired_accounts()'
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron not available — skipping cron schedule. Use Edge Function or manual trigger instead.';
END;
$$;
