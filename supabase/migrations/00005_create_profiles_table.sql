-- =============================================================================
-- Migration 00005: Create profiles table
-- =============================================================================

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  photo_url text,
  bio text,
  graduation_year integer NOT NULL CHECK (graduation_year >= 1950 AND graduation_year <= 2100),
  primary_industry_id uuid NOT NULL REFERENCES public.industries(id),
  primary_specialization_id uuid REFERENCES public.specializations(id),
  secondary_industry_id uuid REFERENCES public.industries(id),
  secondary_specialization_id uuid REFERENCES public.specializations(id),
  country text,
  state_province text,
  city text,
  profile_completeness integer NOT NULL DEFAULT 0 CHECK (profile_completeness >= 0 AND profile_completeness <= 100),
  last_active_at timestamptz DEFAULT now(),
  last_profile_update_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_graduation_year ON public.profiles(graduation_year);
CREATE INDEX idx_profiles_primary_industry ON public.profiles(primary_industry_id);
CREATE INDEX idx_profiles_location ON public.profiles(country, state_province, city);

-- updated_at trigger (handle_updated_at function defined in migration 00001)
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Authenticated users can read profiles of active users
CREATE POLICY profiles_select_active ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = profiles.user_id AND is_active = true
    )
  );

-- Users can insert their own profile (one per user, enforced by UNIQUE)
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all profiles (including inactive users)
CREATE POLICY profiles_admin_select ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update any profile
CREATE POLICY profiles_admin_update ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
