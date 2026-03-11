-- Migration: Profile staleness — periodic update prompts
-- Adds app_settings table for admin-configurable thresholds,
-- staleness tracking columns on profiles, and pg_cron email job.

-- =============================================================================
-- 1. App Settings table (key-value for admin config)
-- =============================================================================

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read settings (banner needs threshold)
CREATE POLICY "Authenticated users can read settings"
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can insert settings"
  ON app_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update settings"
  ON app_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete settings"
  ON app_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger for updated_at
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Seed default staleness threshold (6 months)
INSERT INTO app_settings (key, value, description)
VALUES (
  'profile_staleness_months',
  '6'::jsonb,
  'Number of months after which a profile is considered stale and the user receives update prompts.'
);

-- =============================================================================
-- 2. Add staleness tracking columns to profiles
-- =============================================================================

ALTER TABLE profiles
  ADD COLUMN staleness_nudge_snoozed_at TIMESTAMPTZ,
  ADD COLUMN last_staleness_email_at TIMESTAMPTZ;

-- =============================================================================
-- 3. Add profile_staleness to notification_type enum
-- =============================================================================

ALTER TYPE public.notification_type ADD VALUE 'profile_staleness';

-- =============================================================================
-- 4. Extend admin_audit_log action CHECK to include app setting actions
-- =============================================================================

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_action_check;

ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_action_check
  CHECK (action IN (
    'verify', 'ban', 'unban', 'suspend', 'unsuspend',
    'promote', 'demote', 'delete',
    'taxonomy_create_industry', 'taxonomy_update_industry',
    'taxonomy_archive_industry', 'taxonomy_restore_industry',
    'taxonomy_create_specialization', 'taxonomy_update_specialization',
    'taxonomy_archive_specialization', 'taxonomy_restore_specialization',
    'bulk_invite', 'resend_invite',
    'create_announcement', 'update_announcement',
    'toggle_announcement', 'delete_announcement',
    'warn', 'mute', 'unmute',
    'dismiss_report', 'escalate_report',
    'account_self_delete', 'account_reactivate',
    'update_app_setting'
  ));

-- =============================================================================
-- 5. Postgres function to find stale profiles for email nudge
-- =============================================================================

CREATE OR REPLACE FUNCTION get_stale_profiles_for_email(p_batch_size INT DEFAULT 50)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  profile_updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold_months INT;
BEGIN
  -- Read the configurable threshold
  SELECT (value::int) INTO v_threshold_months
  FROM app_settings
  WHERE key = 'profile_staleness_months';

  -- Default to 6 months if not set
  IF v_threshold_months IS NULL OR v_threshold_months <= 0 THEN
    RETURN; -- Threshold 0 = disabled
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email,
    p.full_name,
    p.updated_at AS profile_updated_at
  FROM users u
  INNER JOIN profiles p ON p.user_id = u.id
  WHERE
    -- Profile is stale
    p.updated_at < (now() - (v_threshold_months || ' months')::interval)
    -- User is verified and active
    AND u.verification_status = 'verified'
    AND u.is_active = true
    AND u.deleted_at IS NULL
    -- Haven't sent email recently (respect the same threshold)
    AND (
      p.last_staleness_email_at IS NULL
      OR p.last_staleness_email_at < (now() - (v_threshold_months || ' months')::interval)
    )
    -- User hasn't opted out of profile_staleness emails
    AND NOT EXISTS (
      SELECT 1 FROM notification_preferences np
      WHERE np.user_id = u.id
        AND np.notification_type = 'profile_staleness'
        AND np.email_enabled = false
    )
  ORDER BY p.updated_at ASC
  LIMIT p_batch_size;
END;
$$;

-- =============================================================================
-- 6. pg_cron job for daily staleness email check
-- =============================================================================

-- The cron job calls an API route that processes the batch.
-- We schedule it at 09:00 UTC daily.
-- If pg_cron is not available (e.g., local dev), gracefully skip.

DO $outer$
BEGIN
  PERFORM cron.schedule(
    'send-staleness-emails',
    '0 9 * * *',
    $cron$SELECT net.http_post(
      url := current_setting('app.settings.site_url', true) || '/api/cron/staleness-emails',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', current_setting('app.settings.cron_secret', true)
      ),
      body := '{}'::jsonb
    )$cron$
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron or pg_net not available — skipping staleness email cron schedule. Use manual trigger or Edge Function instead.';
END;
$outer$;
