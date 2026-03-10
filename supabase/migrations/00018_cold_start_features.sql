-- =============================================================================
-- Migration 00018: Cold-start features
-- =============================================================================
-- 1. profile_views table for popularity tracking (#16)
-- 2. Updated get_recommended_alumni() with cold-start boost (#15)
-- 3. get_popular_alumni() function (#16)

-- =============================================================================
-- 1. profile_views table
-- =============================================================================

CREATE TABLE profile_views (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  view_date date NOT NULL DEFAULT CURRENT_DATE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One view per viewer per profile per day (prevents spam)
CREATE UNIQUE INDEX idx_profile_views_unique_daily
  ON profile_views (profile_id, viewer_id, view_date);

-- For counting views per profile (popularity score)
CREATE INDEX idx_profile_views_profile_viewed_at
  ON profile_views (profile_id, viewed_at);

-- For "who you've viewed" queries (future feature)
CREATE INDEX idx_profile_views_viewer_viewed_at
  ON profile_views (viewer_id, viewed_at);

-- RLS
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert views (only their own viewer_id)
CREATE POLICY "Users can record their own views"
  ON profile_views FOR INSERT
  TO authenticated
  WITH CHECK (viewer_id = auth.uid());

-- Users can read their own view history
CREATE POLICY "Users can read their own views"
  ON profile_views FOR SELECT
  TO authenticated
  USING (viewer_id = auth.uid());

-- Admins can read all views (for analytics)
CREATE POLICY "Admins can read all views"
  ON profile_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- updated_at trigger
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON profile_views
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- 2. Updated get_recommended_alumni() with cold-start boost
-- =============================================================================
-- When p_is_cold_start = true:
--   - Exact grad year match boosted from +5 to +20
--   - Minimum score threshold lowered to 0 (include all matches)

-- Drop the old 2-param version so we can replace with 3-param version
DROP FUNCTION IF EXISTS get_recommended_alumni(uuid, int);

CREATE OR REPLACE FUNCTION get_recommended_alumni(
  p_user_id uuid,
  p_limit int DEFAULT 20,
  p_is_cold_start boolean DEFAULT false
)
RETURNS TABLE (
  profile_id uuid,
  user_id uuid,
  full_name text,
  photo_url text,
  graduation_year int,
  country text,
  state_province text,
  city text,
  bio text,
  has_contact_details boolean,
  last_active_at timestamptz,
  primary_industry_id uuid,
  primary_industry_name text,
  primary_specialization_id uuid,
  primary_specialization_name text,
  score int
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH current_user_profile AS (
    SELECT
      p.id,
      p.user_id,
      p.primary_industry_id,
      p.primary_specialization_id,
      p.secondary_industry_id,
      p.secondary_specialization_id,
      p.graduation_year,
      p.country,
      p.state_province,
      p.city
    FROM profiles p
    WHERE p.user_id = p_user_id
    LIMIT 1
  ),
  current_user_company AS (
    SELECT ce.company
    FROM career_entries ce
    JOIN current_user_profile cup ON ce.profile_id = cup.id
    WHERE ce.is_current = true
    LIMIT 1
  ),
  current_user_tags AS (
    SELECT att.slug
    FROM user_availability_tags uat
    JOIN current_user_profile cup ON uat.profile_id = cup.id
    JOIN availability_tag_types att ON uat.tag_type_id = att.id
  ),
  blocked_users AS (
    SELECT blocked_id AS uid FROM blocks WHERE blocker_id = p_user_id
    UNION
    SELECT blocker_id AS uid FROM blocks WHERE blocked_id = p_user_id
  ),
  connected_users AS (
    SELECT CASE
      WHEN requester_id = p_user_id THEN receiver_id
      ELSE requester_id
    END AS uid
    FROM connections
    WHERE status = 'accepted'
      AND (requester_id = p_user_id OR receiver_id = p_user_id)
  ),
  my_connections AS (
    SELECT CASE
      WHEN requester_id = p_user_id THEN receiver_id
      ELSE requester_id
    END AS uid
    FROM connections
    WHERE status = 'accepted'
      AND (requester_id = p_user_id OR receiver_id = p_user_id)
  ),
  candidate_connections AS (
    SELECT
      CASE WHEN requester_id = c.uid THEN receiver_id ELSE requester_id END AS candidate_uid,
      c.uid AS shared_uid
    FROM connections conn
    JOIN my_connections c ON (conn.requester_id = c.uid OR conn.receiver_id = c.uid)
    WHERE conn.status = 'accepted'
      AND conn.requester_id != p_user_id
      AND conn.receiver_id != p_user_id
  ),
  mutual_counts AS (
    SELECT candidate_uid, COUNT(DISTINCT shared_uid) AS mutual_count
    FROM candidate_connections
    GROUP BY candidate_uid
  ),
  candidate_tags AS (
    SELECT uat.profile_id, att.slug
    FROM user_availability_tags uat
    JOIN availability_tag_types att ON uat.tag_type_id = att.id
  ),
  scored AS (
    SELECT
      p.id AS profile_id,
      p.user_id,
      p.full_name,
      p.photo_url,
      p.graduation_year,
      p.country,
      p.state_province,
      p.city,
      p.bio,
      p.has_contact_details,
      p.last_active_at,
      p.primary_industry_id,
      ind.name AS primary_industry_name,
      p.primary_specialization_id,
      spec.name AS primary_specialization_name,
      (
        -- Same primary specialization: +15
        CASE WHEN cup.primary_specialization_id IS NOT NULL
          AND p.primary_specialization_id = cup.primary_specialization_id
          THEN 15 ELSE 0 END
        -- Same primary industry: +10
        + CASE WHEN cup.primary_industry_id IS NOT NULL
          AND p.primary_industry_id = cup.primary_industry_id
          THEN 10 ELSE 0 END
        -- Location scoring (mutually exclusive tiers)
        + CASE
          WHEN cup.city IS NOT NULL AND p.city IS NOT NULL
            AND LOWER(p.city) = LOWER(cup.city) THEN 8
          WHEN cup.state_province IS NOT NULL AND p.state_province IS NOT NULL
            AND LOWER(p.state_province) = LOWER(cup.state_province) THEN 5
          WHEN cup.country IS NOT NULL AND p.country IS NOT NULL
            AND LOWER(p.country) = LOWER(cup.country) THEN 3
          ELSE 0
        END
        -- Graduation year proximity (cold-start boost for exact match)
        + CASE
          WHEN p_is_cold_start AND p.graduation_year = cup.graduation_year THEN 20
          WHEN ABS(p.graduation_year - cup.graduation_year) <= 5
          THEN 6 - ABS(p.graduation_year - cup.graduation_year)
          ELSE 0
        END
        -- Same current company: +7
        + CASE WHEN cuc.company IS NOT NULL AND EXISTS (
            SELECT 1 FROM career_entries ce2
            WHERE ce2.profile_id = p.id
              AND ce2.is_current = true
              AND LOWER(ce2.company) = LOWER(cuc.company)
          ) THEN 7 ELSE 0 END
        -- Availability match: mentor <-> seeker (+5)
        + CASE
          WHEN EXISTS (SELECT 1 FROM current_user_tags WHERE slug = 'open-to-mentoring')
            AND EXISTS (SELECT 1 FROM candidate_tags ct WHERE ct.profile_id = p.id AND ct.slug IN ('looking-for-work', 'open-to-coffee-chats'))
            THEN 5
          WHEN EXISTS (SELECT 1 FROM current_user_tags WHERE slug IN ('looking-for-work', 'open-to-coffee-chats'))
            AND EXISTS (SELECT 1 FROM candidate_tags ct WHERE ct.profile_id = p.id AND ct.slug = 'open-to-mentoring')
            THEN 5
          WHEN EXISTS (SELECT 1 FROM current_user_tags WHERE slug = 'hiring')
            AND EXISTS (SELECT 1 FROM candidate_tags ct WHERE ct.profile_id = p.id AND ct.slug = 'looking-for-work')
            THEN 5
          WHEN EXISTS (SELECT 1 FROM current_user_tags WHERE slug = 'looking-for-work')
            AND EXISTS (SELECT 1 FROM candidate_tags ct WHERE ct.profile_id = p.id AND ct.slug = 'hiring')
            THEN 5
          ELSE 0
        END
        -- Mutual connections: +3 per mutual
        + COALESCE(mc.mutual_count::int * 3, 0)
      ) AS score
    FROM profiles p
    JOIN users u ON u.id = p.user_id
    CROSS JOIN current_user_profile cup
    LEFT JOIN current_user_company cuc ON true
    LEFT JOIN industries ind ON ind.id = p.primary_industry_id
    LEFT JOIN specializations spec ON spec.id = p.primary_specialization_id
    LEFT JOIN mutual_counts mc ON mc.candidate_uid = p.user_id
    WHERE p.user_id != p_user_id
      AND u.verification_status = 'verified'
      AND u.is_active = true
      AND p.user_id NOT IN (SELECT uid FROM blocked_users)
      AND p.user_id NOT IN (SELECT uid FROM connected_users)
  )
  SELECT
    s.profile_id,
    s.user_id,
    s.full_name,
    s.photo_url,
    s.graduation_year,
    s.country,
    s.state_province,
    s.city,
    s.bio,
    s.has_contact_details,
    s.last_active_at,
    s.primary_industry_id,
    s.primary_industry_name,
    s.primary_specialization_id,
    s.primary_specialization_name,
    s.score
  FROM scored s
  WHERE s.score > 0 OR p_is_cold_start
  ORDER BY s.score DESC, s.last_active_at DESC NULLS LAST
  LIMIT p_limit;
$$;

-- Update grants (new signature has 3 params)
GRANT EXECUTE ON FUNCTION get_recommended_alumni(uuid, int, boolean) TO authenticated;

COMMENT ON FUNCTION get_recommended_alumni(uuid, int, boolean) IS
  'Rule-based recommendation engine with cold-start support. '
  'When p_is_cold_start=true, exact grad year match boosted to +20 and minimum score threshold removed. '
  'Scores by specialization (+15), industry (+10), location (+8/5/3), grad year proximity (+5->+1 or +20 cold-start), '
  'same company (+7), availability match (+5), mutual connections (+3 each).';

-- =============================================================================
-- 3. get_popular_alumni() function
-- =============================================================================
-- Composite popularity: view_count (30 days) + connection_count * 3 + recency bonus

CREATE OR REPLACE FUNCTION get_popular_alumni(
  p_user_id uuid,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  profile_id uuid,
  user_id uuid,
  full_name text,
  photo_url text,
  graduation_year int,
  country text,
  state_province text,
  city text,
  bio text,
  has_contact_details boolean,
  last_active_at timestamptz,
  primary_industry_id uuid,
  primary_industry_name text,
  primary_specialization_id uuid,
  primary_specialization_name text,
  popularity_score bigint,
  view_count bigint,
  connection_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH blocked_users AS (
    SELECT blocked_id AS uid FROM blocks WHERE blocker_id = p_user_id
    UNION
    SELECT blocker_id AS uid FROM blocks WHERE blocked_id = p_user_id
  ),
  connected_users AS (
    SELECT CASE
      WHEN requester_id = p_user_id THEN receiver_id
      ELSE requester_id
    END AS uid
    FROM connections
    WHERE status = 'accepted'
      AND (requester_id = p_user_id OR receiver_id = p_user_id)
  ),
  view_counts AS (
    SELECT
      pv.profile_id,
      COUNT(*) AS cnt
    FROM profile_views pv
    WHERE pv.viewed_at >= now() - interval '30 days'
    GROUP BY pv.profile_id
  ),
  connection_counts AS (
    SELECT
      p.user_id,
      COUNT(*) AS cnt
    FROM connections c
    JOIN profiles p ON p.user_id IN (c.requester_id, c.receiver_id)
    WHERE c.status = 'accepted'
    GROUP BY p.user_id
  ),
  scored AS (
    SELECT
      p.id AS profile_id,
      p.user_id,
      p.full_name,
      p.photo_url,
      p.graduation_year,
      p.country,
      p.state_province,
      p.city,
      p.bio,
      p.has_contact_details,
      p.last_active_at,
      p.primary_industry_id,
      ind.name AS primary_industry_name,
      p.primary_specialization_id,
      spec.name AS primary_specialization_name,
      COALESCE(vc.cnt, 0) AS view_count,
      COALESCE(cc.cnt, 0) AS connection_count,
      (
        COALESCE(vc.cnt, 0)
        + COALESCE(cc.cnt, 0) * 3
        + CASE
            WHEN p.last_active_at >= now() - interval '7 days' THEN 10
            WHEN p.last_active_at >= now() - interval '30 days' THEN 5
            ELSE 0
          END
      ) AS popularity_score
    FROM profiles p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN industries ind ON ind.id = p.primary_industry_id
    LEFT JOIN specializations spec ON spec.id = p.primary_specialization_id
    LEFT JOIN view_counts vc ON vc.profile_id = p.id
    LEFT JOIN connection_counts cc ON cc.user_id = p.user_id
    WHERE p.user_id != p_user_id
      AND u.verification_status = 'verified'
      AND u.is_active = true
      AND p.user_id NOT IN (SELECT uid FROM blocked_users)
      AND p.user_id NOT IN (SELECT uid FROM connected_users)
  )
  SELECT
    s.profile_id,
    s.user_id,
    s.full_name,
    s.photo_url,
    s.graduation_year,
    s.country,
    s.state_province,
    s.city,
    s.bio,
    s.has_contact_details,
    s.last_active_at,
    s.primary_industry_id,
    s.primary_industry_name,
    s.primary_specialization_id,
    s.primary_specialization_name,
    s.popularity_score,
    s.view_count,
    s.connection_count
  FROM scored s
  WHERE s.popularity_score > 0
  ORDER BY s.popularity_score DESC, s.last_active_at DESC NULLS LAST
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_popular_alumni(uuid, int) TO authenticated;

COMMENT ON FUNCTION get_popular_alumni IS
  'Returns popular alumni ranked by composite score: views (30d) + connections*3 + recency bonus (7d=+10, 30d=+5). '
  'Excludes self, blocked, and already-connected users.';
