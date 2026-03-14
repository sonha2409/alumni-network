-- =============================================================================
-- Migration 00036: Message query RPCs (P0 + P10)
-- =============================================================================
-- P0: get_unread_counts — replaces N+1 per-conversation unread counting
-- P10: get_user_conversations — replaces 4+ sequential queries for conversation list

-- =============================================================================
-- P0: Unread counts in a single query
-- =============================================================================

CREATE OR REPLACE FUNCTION get_unread_counts(p_user_id uuid)
RETURNS TABLE(conversation_id uuid, unread_count bigint) AS $$
  SELECT m.conversation_id, COUNT(*) AS unread_count
  FROM messages m
  JOIN conversation_participants cp
    ON cp.conversation_id = m.conversation_id
    AND cp.user_id = p_user_id
  WHERE m.sender_id != p_user_id
    AND m.created_at > cp.last_read_at
  GROUP BY m.conversation_id;
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_unread_counts(uuid) TO authenticated;

COMMENT ON FUNCTION get_unread_counts IS
  'Returns unread message counts per conversation for a user. '
  'Single query replaces N+1 per-conversation counting.';

-- =============================================================================
-- P10: Full conversation list in a single query
-- =============================================================================

CREATE OR REPLACE FUNCTION get_user_conversations(
  p_user_id uuid,
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 20
)
RETURNS TABLE(
  conversation_id uuid,
  last_message_at timestamptz,
  last_message_preview text,
  is_active boolean,
  created_at timestamptz,
  other_user_id uuid,
  other_full_name text,
  other_photo_url text,
  other_profile_id uuid,
  unread_count bigint,
  is_muted boolean,
  total_count bigint
) AS $$
  WITH conversation_total AS (
    SELECT COUNT(*) AS cnt
    FROM conversation_participants cp2
    JOIN conversations c2 ON c2.id = cp2.conversation_id AND c2.is_active = true
    WHERE cp2.user_id = p_user_id
  )
  SELECT
    c.id AS conversation_id,
    c.last_message_at,
    c.last_message_preview,
    c.is_active,
    c.created_at,
    op.user_id AS other_user_id,
    COALESCE(p.full_name, 'Deleted User') AS other_full_name,
    p.photo_url AS other_photo_url,
    p.id AS other_profile_id,
    COALESCE(unread.cnt, 0) AS unread_count,
    cp.is_muted,
    ct.cnt AS total_count
  FROM conversation_participants cp
  JOIN conversations c ON c.id = cp.conversation_id AND c.is_active = true
  JOIN conversation_participants op
    ON op.conversation_id = c.id AND op.user_id != p_user_id
  LEFT JOIN profiles p ON p.user_id = op.user_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt
    FROM messages m
    WHERE m.conversation_id = c.id
      AND m.created_at > cp.last_read_at
      AND m.sender_id != p_user_id
  ) unread ON true
  CROSS JOIN conversation_total ct
  WHERE cp.user_id = p_user_id
  ORDER BY c.last_message_at DESC NULLS LAST
  LIMIT p_page_size OFFSET (p_page - 1) * p_page_size;
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_conversations(uuid, int, int) TO authenticated;

COMMENT ON FUNCTION get_user_conversations IS
  'Returns paginated conversation list with other participant profile, unread count, '
  'and mute status in a single query. Replaces 4+ sequential queries.';
