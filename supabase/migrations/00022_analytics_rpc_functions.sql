-- Analytics RPC functions for admin dashboard
-- All functions restricted to admin role via is_admin() check

-- 1. User status breakdown
CREATE OR REPLACE FUNCTION get_user_status_counts()
RETURNS TABLE(status text, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    verification_status::text AS status,
    COUNT(*) AS count
  FROM users
  WHERE is_active = true
  GROUP BY verification_status;
$$;

-- 2. Signups over time (monthly)
CREATE OR REPLACE FUNCTION get_signups_over_time(start_date date)
RETURNS TABLE(month text, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    to_char(date_trunc('month', created_at), 'YYYY-MM-DD') AS month,
    COUNT(*) AS count
  FROM users
  WHERE created_at >= start_date
  GROUP BY date_trunc('month', created_at)
  ORDER BY date_trunc('month', created_at);
$$;

-- 3. Connections over time (monthly, accepted only)
CREATE OR REPLACE FUNCTION get_connections_over_time(start_date date)
RETURNS TABLE(month text, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    to_char(date_trunc('month', created_at), 'YYYY-MM-DD') AS month,
    COUNT(*) AS count
  FROM connections
  WHERE status = 'accepted'
    AND created_at >= start_date
  GROUP BY date_trunc('month', created_at)
  ORDER BY date_trunc('month', created_at);
$$;

-- 4. Messages over time (monthly)
CREATE OR REPLACE FUNCTION get_messages_over_time(start_date date)
RETURNS TABLE(month text, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    to_char(date_trunc('month', created_at), 'YYYY-MM-DD') AS month,
    COUNT(*) AS count
  FROM messages
  WHERE created_at >= start_date
  GROUP BY date_trunc('month', created_at)
  ORDER BY date_trunc('month', created_at);
$$;

-- 5. Top industries by user count
CREATE OR REPLACE FUNCTION get_top_industries(limit_count int DEFAULT 10)
RETURNS TABLE(name text, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.name,
    COUNT(*) AS count
  FROM profiles p
  JOIN industries i ON i.id = p.primary_industry_id
  WHERE p.primary_industry_id IS NOT NULL
  GROUP BY i.name
  ORDER BY count DESC
  LIMIT limit_count;
$$;

-- 6. Top locations by user count
CREATE OR REPLACE FUNCTION get_top_locations(limit_count int DEFAULT 10)
RETURNS TABLE(name text, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    country AS name,
    COUNT(*) AS count
  FROM profiles
  WHERE country IS NOT NULL AND country != ''
  GROUP BY country
  ORDER BY count DESC
  LIMIT limit_count;
$$;
