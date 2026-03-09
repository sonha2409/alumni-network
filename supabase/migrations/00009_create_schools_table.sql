-- =============================================================================
-- Migration 00009: Create schools table + link to profiles/verification_requests
-- Introduces school identity for PTNK (single-school deployment).
-- =============================================================================

-- Deterministic UUID for PTNK seed row
-- Generated from: SELECT uuid_generate_v5(uuid_ns_dns(), 'ptnk.edu.vn')
-- Hardcoded so all environments share the same ID.

CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  name_en text,
  abbreviation text,
  slug text UNIQUE NOT NULL,
  school_type text NOT NULL CHECK (school_type IN ('high_school', 'university', 'college')),
  program_duration_years integer NOT NULL CHECK (program_duration_years > 0),
  founded_year integer NOT NULL,
  first_graduating_year integer NOT NULL,
  country text,
  state_province text,
  city text,
  website_url text,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE TRIGGER on_schools_updated
  BEFORE UPDATE ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- Seed PTNK
-- =============================================================================

INSERT INTO public.schools (
  id, name, name_en, abbreviation, slug, school_type,
  program_duration_years, founded_year, first_graduating_year,
  country, state_province, city, website_url
) VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Trường Phổ thông Năng khiếu',
  'VNU-HCM High School for the Gifted',
  'PTNK',
  'ptnk',
  'high_school',
  3,
  1996,
  1999,
  'Vietnam',
  'Ho Chi Minh City',
  NULL,
  'https://ptnk.edu.vn'
);

-- =============================================================================
-- Add school_id FK to profiles
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN school_id uuid NOT NULL
    DEFAULT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    REFERENCES public.schools(id);

CREATE INDEX idx_profiles_school_id ON public.profiles(school_id);

-- =============================================================================
-- Add school_id FK to verification_requests
-- =============================================================================

ALTER TABLE public.verification_requests
  ADD COLUMN school_id uuid NOT NULL
    DEFAULT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    REFERENCES public.schools(id);

CREATE INDEX idx_verification_requests_school_id ON public.verification_requests(school_id);

-- =============================================================================
-- Rename degree_program → specialization_name in verification_requests
-- =============================================================================

ALTER TABLE public.verification_requests
  RENAME COLUMN degree_program TO specialization_name;

-- =============================================================================
-- Widen profiles.graduation_year CHECK constraint
-- Old: >= 1950 AND <= 2100
-- New: >= 1900 AND <= current_year + 6 (school-specific range enforced at app layer)
-- =============================================================================

ALTER TABLE public.profiles
  DROP CONSTRAINT profiles_graduation_year_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_graduation_year_check
    CHECK (graduation_year >= 1900 AND graduation_year <= EXTRACT(YEAR FROM now())::integer + 6);

-- =============================================================================
-- RLS for schools
-- =============================================================================

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read schools
CREATE POLICY schools_select_authenticated
  ON public.schools FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admins can update schools
CREATE POLICY schools_admin_update
  ON public.schools FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
