-- F45: Last seen online (privacy-gated)
--
-- Adds:
--   1. profiles.show_last_active — per-user privacy toggle (default true).
--   2. touch_last_seen() — throttled UPDATE called fire-and-forget from proxy.ts.
--      Self-guards with a 1-minute WHERE clause so write volume is bounded.
--   3. can_see_last_seen(p_target) — encapsulates the visibility gate:
--        viewer = target, OR
--        target.show_last_active = true
--          AND viewer/target are connected (accepted)
--          AND both sent ≥1 non-deleted message in a shared conversation.
--   4. get_last_seen(p_target) — returns the timestamp if the gate passes, NULL otherwise.
--      Clients cannot distinguish "hidden" from "never online" (matches WhatsApp).
--
-- Notes:
--   - last_active_at already exists (00005) and is indexed (00010). We don't touch it.
--   - SECURITY DEFINER so the gate's message/connection lookups bypass edge-case RLS
--     and are audited in one place. All three functions pin search_path = public.
--   - The directory "recently active" sort continues to read last_active_at directly
--     for ordering; get_last_seen() is the only supported display readout.

-- 1. Privacy toggle
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_last_active boolean NOT NULL DEFAULT true;

-- 2. Throttled touch RPC
CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
     SET last_active_at = now()
   WHERE user_id = auth.uid()
     AND last_active_at < now() - interval '1 minute';
$$;

REVOKE ALL ON FUNCTION public.touch_last_seen() FROM public;
GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;

-- 3. Visibility gate helper
CREATE OR REPLACE FUNCTION public.can_see_last_seen(p_target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN auth.uid() = p_target THEN true
    ELSE
      EXISTS (
        SELECT 1
          FROM public.profiles pr
         WHERE pr.user_id = p_target
           AND pr.show_last_active = true
      )
      AND public.is_connected_to(auth.uid(), p_target)
      AND EXISTS (
        SELECT 1
          FROM public.conversations c
          JOIN public.conversation_participants p1
            ON p1.conversation_id = c.id AND p1.user_id = auth.uid()
          JOIN public.conversation_participants p2
            ON p2.conversation_id = c.id AND p2.user_id = p_target
         WHERE EXISTS (
                 SELECT 1 FROM public.messages m
                  WHERE m.conversation_id = c.id
                    AND m.sender_id = auth.uid()
                    AND m.is_deleted = false
               )
           AND EXISTS (
                 SELECT 1 FROM public.messages m
                  WHERE m.conversation_id = c.id
                    AND m.sender_id = p_target
                    AND m.is_deleted = false
               )
      )
  END;
$$;

REVOKE ALL ON FUNCTION public.can_see_last_seen(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.can_see_last_seen(uuid) TO authenticated;

-- 4. Public read RPC
CREATE OR REPLACE FUNCTION public.get_last_seen(p_target uuid)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.last_active_at
    FROM public.profiles pr
   WHERE pr.user_id = p_target
     AND public.can_see_last_seen(p_target);
$$;

REVOKE ALL ON FUNCTION public.get_last_seen(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_last_seen(uuid) TO authenticated;
