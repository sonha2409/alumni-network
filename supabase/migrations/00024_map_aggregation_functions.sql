-- Map aggregation RPC functions for the alumni world map feature.
-- All functions are SECURITY DEFINER to bypass RLS and return aggregated counts only.

--------------------------------------------------------------------------------
-- 1. Country-level counts (user-facing, verified users only)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_map_country_counts(
  p_filters jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  country text,
  alumni_count bigint,
  latitude double precision,
  longitude double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.country,
    COUNT(*)::bigint AS alumni_count,
    -- Use average of geocoded profiles as country centroid fallback
    AVG(p.latitude) AS latitude,
    AVG(p.longitude) AS longitude
  FROM profiles p
  JOIN users u ON u.id = p.user_id
  WHERE
    p.country IS NOT NULL
    AND p.country != ''
    AND u.verification_status = 'verified'
    AND u.is_active = true
    -- Optional filters from JSONB
    AND (
      (p_filters->>'industry_id') IS NULL
      OR p.primary_industry_id = (p_filters->>'industry_id')::uuid
    )
    AND (
      (p_filters->>'specialization_id') IS NULL
      OR p.primary_specialization_id = (p_filters->>'specialization_id')::uuid
    )
    AND (
      (p_filters->>'year_min') IS NULL
      OR p.graduation_year >= (p_filters->>'year_min')::int
    )
    AND (
      (p_filters->>'year_max') IS NULL
      OR p.graduation_year <= (p_filters->>'year_max')::int
    )
  GROUP BY p.country
  ORDER BY alumni_count DESC;
END;
$$;

--------------------------------------------------------------------------------
-- 2. Region (state/province) counts within a country
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_map_region_counts(
  p_country text,
  p_filters jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  state_province text,
  alumni_count bigint,
  avg_latitude double precision,
  avg_longitude double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.state_province,
    COUNT(*)::bigint AS alumni_count,
    AVG(p.latitude) AS avg_latitude,
    AVG(p.longitude) AS avg_longitude
  FROM profiles p
  JOIN users u ON u.id = p.user_id
  WHERE
    p.state_province IS NOT NULL
    AND p.state_province != ''
    AND LOWER(p.country) = LOWER(p_country)
    AND u.verification_status = 'verified'
    AND u.is_active = true
    AND (
      (p_filters->>'industry_id') IS NULL
      OR p.primary_industry_id = (p_filters->>'industry_id')::uuid
    )
    AND (
      (p_filters->>'specialization_id') IS NULL
      OR p.primary_specialization_id = (p_filters->>'specialization_id')::uuid
    )
    AND (
      (p_filters->>'year_min') IS NULL
      OR p.graduation_year >= (p_filters->>'year_min')::int
    )
    AND (
      (p_filters->>'year_max') IS NULL
      OR p.graduation_year <= (p_filters->>'year_max')::int
    )
  GROUP BY p.state_province
  ORDER BY alumni_count DESC;
END;
$$;

--------------------------------------------------------------------------------
-- 3. City-level counts within a state/country
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_map_city_counts(
  p_country text,
  p_state text DEFAULT NULL,
  p_filters jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  city text,
  alumni_count bigint,
  avg_latitude double precision,
  avg_longitude double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.city,
    COUNT(*)::bigint AS alumni_count,
    AVG(p.latitude) AS avg_latitude,
    AVG(p.longitude) AS avg_longitude
  FROM profiles p
  JOIN users u ON u.id = p.user_id
  WHERE
    p.city IS NOT NULL
    AND p.city != ''
    AND LOWER(p.country) = LOWER(p_country)
    AND (
      p_state IS NULL
      OR LOWER(p.state_province) = LOWER(p_state)
    )
    AND u.verification_status = 'verified'
    AND u.is_active = true
    AND (
      (p_filters->>'industry_id') IS NULL
      OR p.primary_industry_id = (p_filters->>'industry_id')::uuid
    )
    AND (
      (p_filters->>'specialization_id') IS NULL
      OR p.primary_specialization_id = (p_filters->>'specialization_id')::uuid
    )
    AND (
      (p_filters->>'year_min') IS NULL
      OR p.graduation_year >= (p_filters->>'year_min')::int
    )
    AND (
      (p_filters->>'year_max') IS NULL
      OR p.graduation_year <= (p_filters->>'year_max')::int
    )
  GROUP BY p.city
  ORDER BY alumni_count DESC;
END;
$$;

--------------------------------------------------------------------------------
-- 4. Admin country counts (includes unverified toggle)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_map_country_counts_admin(
  p_include_unverified boolean DEFAULT false,
  p_filters jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  country text,
  alumni_count bigint,
  verified_count bigint,
  unverified_count bigint,
  latitude double precision,
  longitude double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  RETURN QUERY
  SELECT
    p.country,
    COUNT(*)::bigint AS alumni_count,
    COUNT(*) FILTER (WHERE u.verification_status = 'verified')::bigint AS verified_count,
    COUNT(*) FILTER (WHERE u.verification_status != 'verified')::bigint AS unverified_count,
    AVG(p.latitude) AS latitude,
    AVG(p.longitude) AS longitude
  FROM profiles p
  JOIN users u ON u.id = p.user_id
  WHERE
    p.country IS NOT NULL
    AND p.country != ''
    AND u.is_active = true
    AND (
      p_include_unverified = true
      OR u.verification_status = 'verified'
    )
    AND (
      (p_filters->>'industry_id') IS NULL
      OR p.primary_industry_id = (p_filters->>'industry_id')::uuid
    )
    AND (
      (p_filters->>'specialization_id') IS NULL
      OR p.primary_specialization_id = (p_filters->>'specialization_id')::uuid
    )
    AND (
      (p_filters->>'year_min') IS NULL
      OR p.graduation_year >= (p_filters->>'year_min')::int
    )
    AND (
      (p_filters->>'year_max') IS NULL
      OR p.graduation_year <= (p_filters->>'year_max')::int
    )
  GROUP BY p.country
  ORDER BY alumni_count DESC;
END;
$$;

--------------------------------------------------------------------------------
-- 5. Admin trend data (new users per country per month)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_map_trend_data(
  p_country text DEFAULT NULL,
  p_months int DEFAULT 6
)
RETURNS TABLE(
  country text,
  month text,
  new_users bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  RETURN QUERY
  SELECT
    p.country,
    TO_CHAR(p.created_at, 'YYYY-MM') AS month,
    COUNT(*)::bigint AS new_users
  FROM profiles p
  JOIN users u ON u.id = p.user_id
  WHERE
    p.country IS NOT NULL
    AND p.country != ''
    AND u.is_active = true
    AND p.created_at >= (NOW() - (p_months || ' months')::interval)
    AND (
      p_country IS NULL
      OR LOWER(p.country) = LOWER(p_country)
    )
  GROUP BY p.country, TO_CHAR(p.created_at, 'YYYY-MM')
  ORDER BY month DESC, new_users DESC;
END;
$$;
