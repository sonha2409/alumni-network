-- =============================================================================
-- Migration 00008: Create career_entries, education_entries,
--                  availability_tag_types, and user_availability_tags tables
-- =============================================================================

-- =============================================================================
-- Career Entries
-- =============================================================================

CREATE TABLE public.career_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_title text NOT NULL,
  company text NOT NULL,
  industry_id uuid REFERENCES public.industries(id),
  specialization_id uuid REFERENCES public.specializations(id),
  start_date date NOT NULL,
  end_date date,
  description text,
  is_current boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT career_entries_date_check CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT career_entries_description_length CHECK (char_length(description) <= 500)
);

CREATE INDEX idx_career_entries_profile_id ON public.career_entries(profile_id);
CREATE INDEX idx_career_entries_company ON public.career_entries(company);
CREATE INDEX idx_career_entries_industry_id ON public.career_entries(industry_id);

CREATE TRIGGER on_career_entries_updated
  BEFORE UPDATE ON public.career_entries
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.career_entries ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read career entries of active users
CREATE POLICY career_entries_select_active ON public.career_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.users u ON u.id = p.user_id
      WHERE p.id = career_entries.profile_id AND u.is_active = true
    )
  );

-- Users can insert their own career entries
CREATE POLICY career_entries_insert_own ON public.career_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = career_entries.profile_id AND user_id = auth.uid()
    )
  );

-- Users can update their own career entries
CREATE POLICY career_entries_update_own ON public.career_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = career_entries.profile_id AND user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = career_entries.profile_id AND user_id = auth.uid()
    )
  );

-- Users can delete their own career entries
CREATE POLICY career_entries_delete_own ON public.career_entries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = career_entries.profile_id AND user_id = auth.uid()
    )
  );

-- Admins can do everything
CREATE POLICY career_entries_admin_all ON public.career_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================================================
-- Education Entries
-- =============================================================================

CREATE TABLE public.education_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  institution text NOT NULL,
  degree text,
  field_of_study text,
  start_year integer,
  end_year integer,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT education_entries_year_check CHECK (
    start_year IS NULL OR end_year IS NULL OR end_year >= start_year
  ),
  CONSTRAINT education_entries_start_year_range CHECK (
    start_year IS NULL OR (start_year >= 1950 AND start_year <= 2100)
  ),
  CONSTRAINT education_entries_end_year_range CHECK (
    end_year IS NULL OR (end_year >= 1950 AND end_year <= 2100)
  )
);

CREATE INDEX idx_education_entries_profile_id ON public.education_entries(profile_id);

CREATE TRIGGER on_education_entries_updated
  BEFORE UPDATE ON public.education_entries
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.education_entries ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read education entries of active users
CREATE POLICY education_entries_select_active ON public.education_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.users u ON u.id = p.user_id
      WHERE p.id = education_entries.profile_id AND u.is_active = true
    )
  );

-- Users can insert their own education entries
CREATE POLICY education_entries_insert_own ON public.education_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = education_entries.profile_id AND user_id = auth.uid()
    )
  );

-- Users can update their own education entries
CREATE POLICY education_entries_update_own ON public.education_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = education_entries.profile_id AND user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = education_entries.profile_id AND user_id = auth.uid()
    )
  );

-- Users can delete their own education entries
CREATE POLICY education_entries_delete_own ON public.education_entries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = education_entries.profile_id AND user_id = auth.uid()
    )
  );

-- Admins can do everything
CREATE POLICY education_entries_admin_all ON public.education_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================================================
-- Availability Tag Types (reference/lookup table)
-- =============================================================================

CREATE TABLE public.availability_tag_types (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  is_archived boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER on_availability_tag_types_updated
  BEFORE UPDATE ON public.availability_tag_types
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.availability_tag_types ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read non-archived tag types
CREATE POLICY availability_tag_types_select_active ON public.availability_tag_types
  FOR SELECT USING (is_archived = false);

-- Admins can read all (including archived)
CREATE POLICY availability_tag_types_admin_select ON public.availability_tag_types
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can manage tag types
CREATE POLICY availability_tag_types_admin_all ON public.availability_tag_types
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================================================
-- User Availability Tags (junction table)
-- =============================================================================

CREATE TABLE public.user_availability_tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tag_type_id uuid NOT NULL REFERENCES public.availability_tag_types(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(profile_id, tag_type_id)
);

CREATE INDEX idx_user_availability_tags_profile_id ON public.user_availability_tags(profile_id);
CREATE INDEX idx_user_availability_tags_tag_type_id ON public.user_availability_tags(tag_type_id);

ALTER TABLE public.user_availability_tags ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read tags of active users
CREATE POLICY user_availability_tags_select_active ON public.user_availability_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.users u ON u.id = p.user_id
      WHERE p.id = user_availability_tags.profile_id AND u.is_active = true
    )
  );

-- Users can insert their own tags
CREATE POLICY user_availability_tags_insert_own ON public.user_availability_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = user_availability_tags.profile_id AND user_id = auth.uid()
    )
  );

-- Users can delete their own tags
CREATE POLICY user_availability_tags_delete_own ON public.user_availability_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = user_availability_tags.profile_id AND user_id = auth.uid()
    )
  );

-- Admins can do everything
CREATE POLICY user_availability_tags_admin_all ON public.user_availability_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================================================
-- Seed availability tag types
-- =============================================================================

INSERT INTO public.availability_tag_types (name, slug, description, sort_order) VALUES
  ('Open to mentoring', 'open-to-mentoring', 'Willing to mentor other alumni', 1),
  ('Open to coffee chats', 'open-to-coffee-chats', 'Happy to have informal conversations', 2),
  ('Hiring / looking for referrals', 'hiring', 'Currently hiring or can refer candidates', 3),
  ('Looking for work', 'looking-for-work', 'Actively seeking new opportunities', 4),
  ('Open to collaboration', 'open-to-collaboration', 'Interested in project collaborations', 5),
  ('Not currently available', 'not-currently-available', 'Not available for connections right now', 6);
