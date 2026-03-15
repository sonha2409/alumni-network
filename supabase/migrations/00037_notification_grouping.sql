-- =============================================================================
-- Migration 00037: Notification grouping for messages
-- Groups repeated new_message notifications per conversation into a single row
-- =============================================================================

-- Add grouped_count column (default 1 for all existing rows)
ALTER TABLE notifications ADD COLUMN grouped_count INTEGER NOT NULL DEFAULT 1;

-- =============================================================================
-- Upsert function for grouped message notifications (SECURITY DEFINER)
-- =============================================================================

CREATE OR REPLACE FUNCTION upsert_message_notification(
  p_user_id UUID,
  p_type notification_type,
  p_actor_name TEXT,
  p_body TEXT,
  p_link TEXT
) RETURNS TABLE(notification_id UUID, is_new BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
  v_count INTEGER;
  v_new_count INTEGER;
  v_new_id UUID;
BEGIN
  -- Look for an existing unread notification with same type and link
  SELECT n.id, n.grouped_count INTO v_existing_id, v_count
  FROM notifications n
  WHERE n.user_id = p_user_id
    AND n.type = p_type
    AND n.link = p_link
    AND n.is_read = false
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing: increment count, refresh title/body
    v_new_count := v_count + 1;

    UPDATE notifications
    SET title = p_actor_name || ' sent you ' || v_new_count || ' messages',
        body = p_body,
        grouped_count = v_new_count,
        updated_at = now()
    WHERE notifications.id = v_existing_id;

    RETURN QUERY SELECT v_existing_id, false;
  ELSE
    -- Create new notification (count = 1)
    INSERT INTO notifications (user_id, type, title, body, link, grouped_count)
    VALUES (p_user_id, p_type, 'New message from ' || p_actor_name, p_body, p_link, 1)
    RETURNING notifications.id INTO v_new_id;

    RETURN QUERY SELECT v_new_id, true;
  END IF;
END;
$$;
