-- Add geocoding columns to profiles for map feature
-- Stores latitude/longitude resolved from free-text country/state/city fields

ALTER TABLE public.profiles
  ADD COLUMN latitude double precision,
  ADD COLUMN longitude double precision,
  ADD COLUMN location_geocoded_at timestamptz;

-- Partial index for map queries — only index rows that have coordinates
CREATE INDEX idx_profiles_lat_lng
  ON public.profiles (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
