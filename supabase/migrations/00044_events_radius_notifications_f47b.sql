-- =============================================================================
-- F47b: Events — radius notifications
-- =============================================================================
-- Adds:
--   1. profiles.notify_events_within_km preference column
--   2. notification_type enum value 'event_nearby'
--   3. daily_email_counters table (shared Resend budget tracking)
--   4. events_find_nearby_recipients() RPC (Haversine, SECURITY DEFINER)
--   5. increment_email_counter() / get_email_counter() helper RPCs

-- ---------------------------------------------------------------------------
-- 1. Profile preference column
-- ---------------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN notify_events_within_km INTEGER
  CHECK (notify_events_within_km IS NULL OR notify_events_within_km BETWEEN 5 AND 500);

COMMENT ON COLUMN profiles.notify_events_within_km
  IS 'Radius in km for nearby-event notifications. NULL = opted out (default).';

-- ---------------------------------------------------------------------------
-- 2. Notification type
-- ---------------------------------------------------------------------------
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'event_nearby';

-- ---------------------------------------------------------------------------
-- 3. Daily email counters
-- ---------------------------------------------------------------------------
CREATE TABLE daily_email_counters (
  date        DATE    NOT NULL,
  counter_key TEXT    NOT NULL,
  count       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, counter_key)
);

ALTER TABLE daily_email_counters ENABLE ROW LEVEL SECURITY;
-- No user-facing RLS policies — accessed only via SECURITY DEFINER RPCs.

COMMENT ON TABLE daily_email_counters
  IS 'Tracks daily email send counts for shared Resend budget caps (F47b).';

-- ---------------------------------------------------------------------------
-- 4. Haversine-based recipient finder
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION events_find_nearby_recipients(p_event_id UUID)
RETURNS TABLE (user_id UUID, distance_km DOUBLE PRECISION)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id  UUID;
  v_lat         DOUBLE PRECISION;
  v_lng         DOUBLE PRECISION;
  v_is_public   BOOLEAN;
BEGIN
  -- Load event coordinates
  SELECT e.creator_id, e.latitude::double precision, e.longitude::double precision, e.is_public
    INTO v_creator_id, v_lat, v_lng, v_is_public
    FROM events e
   WHERE e.id = p_event_id
     AND e.deleted_at IS NULL;

  -- Bail if event not found, not geocoded, or private
  IF v_creator_id IS NULL OR v_lat IS NULL OR v_is_public IS NOT TRUE THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT sub.user_id, sub.distance_km
  FROM (
    SELECT p.user_id,
           p.notify_events_within_km,
           6371.0 * acos(
             LEAST(1.0,
               cos(radians(v_lat)) * cos(radians(p.latitude))
               * cos(radians(p.longitude) - radians(v_lng))
               + sin(radians(v_lat)) * sin(radians(p.latitude))
             )
           ) AS distance_km
      FROM profiles p
      JOIN users u ON u.id = p.user_id
     WHERE p.latitude IS NOT NULL
       AND p.longitude IS NOT NULL
       AND p.notify_events_within_km IS NOT NULL
       AND u.verification_status = 'verified'
       AND u.is_active = TRUE
       AND u.deleted_at IS NULL
       AND p.user_id != v_creator_id
       AND NOT EXISTS (
         SELECT 1 FROM blocks b
          WHERE (b.blocker_id = p.user_id AND b.blocked_id = v_creator_id)
             OR (b.blocker_id = v_creator_id AND b.blocked_id = p.user_id)
       )
  ) sub
  WHERE sub.distance_km <= sub.notify_events_within_km
  ORDER BY sub.distance_km;
END;
$$;

COMMENT ON FUNCTION events_find_nearby_recipients(UUID)
  IS 'Returns verified users within their chosen radius of the given event (Haversine). Excludes creator and blocked users.';

-- ---------------------------------------------------------------------------
-- 5. Counter helpers (SECURITY DEFINER — no direct table access needed)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_email_counter(
  p_counter_key TEXT,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  INSERT INTO daily_email_counters (date, counter_key, count)
  VALUES (p_date, p_counter_key, 1)
  ON CONFLICT (date, counter_key)
  DO UPDATE SET count = daily_email_counters.count + 1
  RETURNING count INTO v_new_count;

  RETURN v_new_count;
END;
$$;

CREATE OR REPLACE FUNCTION get_email_counter(
  p_counter_key TEXT,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count INTO v_count
    FROM daily_email_counters
   WHERE date = p_date
     AND counter_key = p_counter_key;

  RETURN COALESCE(v_count, 0);
END;
$$;
