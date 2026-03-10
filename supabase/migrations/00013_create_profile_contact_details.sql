-- =============================================================================
-- Migration 00013: Profile contact details + visibility support
-- =============================================================================

-- =============================================================================
-- Reusable function: is_connected_to(user_a, user_b)
-- Returns true if the two users have an accepted connection.
-- SECURITY DEFINER so it can read connections regardless of caller's RLS context.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_connected_to(user_a uuid, user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.connections
    WHERE status = 'accepted'
      AND (
        (requester_id = user_a AND receiver_id = user_b)
        OR (requester_id = user_b AND receiver_id = user_a)
      )
  );
$$;

-- =============================================================================
-- Table: profile_contact_details
-- Stores contact info visible only to connected users, owner, and admins.
-- =============================================================================

CREATE TABLE public.profile_contact_details (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  personal_email text,
  phone text CHECK (char_length(phone) <= 30),
  linkedin_url text,
  github_url text,
  website_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for FK lookups
CREATE INDEX idx_profile_contact_details_profile_id ON public.profile_contact_details(profile_id);

-- updated_at trigger (reuses existing handle_updated_at function)
CREATE TRIGGER set_profile_contact_details_updated_at
  BEFORE UPDATE ON public.profile_contact_details
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- Add has_contact_details flag to profiles
-- =============================================================================

ALTER TABLE public.profiles ADD COLUMN has_contact_details boolean NOT NULL DEFAULT false;

-- =============================================================================
-- RLS on profile_contact_details
-- =============================================================================

ALTER TABLE public.profile_contact_details ENABLE ROW LEVEL SECURITY;

-- Owner can SELECT their own contact details
CREATE POLICY "Owner can view own contact details"
  ON public.profile_contact_details
  FOR SELECT
  USING (
    auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id)
  );

-- Owner can INSERT their own contact details
CREATE POLICY "Owner can insert own contact details"
  ON public.profile_contact_details
  FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id)
  );

-- Owner can UPDATE their own contact details
CREATE POLICY "Owner can update own contact details"
  ON public.profile_contact_details
  FOR UPDATE
  USING (
    auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id)
  );

-- Owner can DELETE their own contact details
CREATE POLICY "Owner can delete own contact details"
  ON public.profile_contact_details
  FOR DELETE
  USING (
    auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id)
  );

-- Connected users can view contact details
CREATE POLICY "Connected users can view contact details"
  ON public.profile_contact_details
  FOR SELECT
  USING (
    is_connected_to(
      auth.uid(),
      (SELECT user_id FROM public.profiles WHERE id = profile_id)
    )
  );

-- Admin/moderator can view all contact details
CREATE POLICY "Admin and moderator can view all contact details"
  ON public.profile_contact_details
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'moderator')
    )
  );
