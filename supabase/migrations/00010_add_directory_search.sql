-- =============================================================================
-- Migration 00010: Add full-text search support for alumni directory
-- =============================================================================

-- Add tsvector column to profiles for full-text search
ALTER TABLE public.profiles ADD COLUMN search_vector tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX idx_profiles_search_vector ON public.profiles USING GIN (search_vector);

-- Function to update search vector on profile changes
-- Weights: A = name (highest priority), C = bio
CREATE OR REPLACE FUNCTION update_profile_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.bio, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: auto-update search_vector on profile insert/update
CREATE TRIGGER trg_profiles_search_vector
  BEFORE INSERT OR UPDATE OF full_name, bio ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_profile_search_vector();

-- Backfill existing profiles
UPDATE public.profiles SET search_vector =
  setweight(to_tsvector('english', coalesce(full_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(bio, '')), 'C');

-- Additional index: profiles sorted by last_active_at for "recently active" sort
CREATE INDEX idx_profiles_last_active_at ON public.profiles(last_active_at DESC NULLS LAST);

-- Additional index: profiles full_name for alphabetical sort
CREATE INDEX idx_profiles_full_name ON public.profiles(full_name);
