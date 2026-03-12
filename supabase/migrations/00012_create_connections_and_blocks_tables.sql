-- =============================================================================
-- Migration 00012: Create connections and blocks tables
-- =============================================================================

-- =============================================================================
-- Connections
-- =============================================================================

CREATE TABLE public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.users(id),
  receiver_id uuid NOT NULL REFERENCES public.users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT connections_no_self CHECK (requester_id != receiver_id),
  CONSTRAINT connections_message_length CHECK (char_length(message) <= 500),
  CONSTRAINT connections_unique_pair UNIQUE (requester_id, receiver_id)
);

CREATE INDEX idx_connections_requester_id ON public.connections(requester_id);
CREATE INDEX idx_connections_receiver_id ON public.connections(receiver_id);
CREATE INDEX idx_connections_status ON public.connections(status);
CREATE INDEX idx_connections_requester_status ON public.connections(requester_id, status);
CREATE INDEX idx_connections_receiver_status ON public.connections(receiver_id, status);

CREATE TRIGGER on_connections_updated
  BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Users can see connections they are part of
CREATE POLICY connections_select_own ON public.connections
  FOR SELECT USING (
    auth.uid() IN (requester_id, receiver_id)
  );

-- Verified users can send connection requests (insert as requester)
CREATE POLICY connections_insert_verified ON public.connections
  FOR INSERT WITH CHECK (
    auth.uid() = requester_id
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND verification_status = 'verified'
      AND is_active = true
    )
  );

-- Receiver can update (accept/reject) pending requests
CREATE POLICY connections_update_receiver ON public.connections
  FOR UPDATE USING (
    auth.uid() = receiver_id
    AND status = 'pending'
  ) WITH CHECK (
    auth.uid() = receiver_id
    AND status IN ('accepted', 'rejected')
  );

-- Either party can delete (disconnect / cancel request)
CREATE POLICY connections_delete_own ON public.connections
  FOR DELETE USING (
    auth.uid() IN (requester_id, receiver_id)
  );

-- Admin override: full access
CREATE POLICY connections_admin_all ON public.connections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================================================
-- Blocks
-- =============================================================================

CREATE TABLE public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES public.users(id),
  blocked_id uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT blocks_no_self CHECK (blocker_id != blocked_id),
  CONSTRAINT blocks_unique_pair UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX idx_blocks_blocker_id ON public.blocks(blocker_id);
CREATE INDEX idx_blocks_blocked_id ON public.blocks(blocked_id);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Users can see their own blocks
CREATE POLICY blocks_select_own ON public.blocks
  FOR SELECT USING (auth.uid() = blocker_id);

-- Verified users can block others
CREATE POLICY blocks_insert_verified ON public.blocks
  FOR INSERT WITH CHECK (
    auth.uid() = blocker_id
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND verification_status = 'verified'
      AND is_active = true
    )
  );

-- Users can unblock (delete their own blocks)
CREATE POLICY blocks_delete_own ON public.blocks
  FOR DELETE USING (auth.uid() = blocker_id);

-- Admin override: full access
CREATE POLICY blocks_admin_all ON public.blocks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
