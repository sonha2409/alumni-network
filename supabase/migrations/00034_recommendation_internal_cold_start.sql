-- =============================================================================
-- Migration 00034: Move cold-start detection into get_recommended_alumni RPC
-- =============================================================================
-- Previously the dashboard had to fetch the profile first to get
-- profile_completeness before calling get_recommended_alumni.
-- Now the RPC reads profile_completeness internally, allowing the dashboard
-- to fire profile + recommendations + popular in parallel.

-- Drop old 3-param version
DROP FUNCTION IF EXISTS get_recommended_alumni(uuid, int, boolean);

CREATE OR REPLACE FUNCTION get_recommended_alumni(
  p_user_id uuid,
  p_limit int DEFAULT 20
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
      p.city,
      p.profile_completeness
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
      cup.profile_completeness AS user_completeness,
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
          WHEN cup.profile_completeness < 40 AND p.graduation_year = cup.graduation_year THEN 20
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
  WHERE s.score > 0 OR s.user_completeness < 40
  ORDER BY s.score DESC, s.last_active_at DESC NULLS LAST
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_recommended_alumni(uuid, int) TO authenticated;

COMMENT ON FUNCTION get_recommended_alumni(uuid, int) IS
  'Rule-based recommendation engine with internal cold-start detection. '
  'Reads profile_completeness from the requesting user''s profile — cold-start (<40%) boosts '
  'exact grad year match to +20 and removes minimum score threshold. '
  'Scores by specialization (+15), industry (+10), location (+8/5/3), grad year proximity (+5->+1), '
  'same company (+7), availability match (+5), mutual connections (+3 each).';
