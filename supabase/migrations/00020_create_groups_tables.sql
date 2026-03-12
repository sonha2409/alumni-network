-- Migration 00020: Groups (basic, admin-created)
-- Feature: F10 Groups

-- =============================================================================
-- 1. groups table
-- =============================================================================

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('year_based', 'field_based', 'location_based', 'custom')),
  cover_image_url TEXT,
  max_members INTEGER,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT groups_name_unique UNIQUE (name),
  CONSTRAINT groups_slug_unique UNIQUE (slug),
  CONSTRAINT groups_max_members_positive CHECK (max_members IS NULL OR max_members > 0)
);

-- Indexes
CREATE INDEX idx_groups_type ON groups(type);
CREATE INDEX idx_groups_created_by ON groups(created_by);
CREATE INDEX idx_groups_active ON groups(is_active) WHERE is_active = true;

-- updated_at trigger
CREATE TRIGGER trigger_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- 2. group_members table
-- =============================================================================

CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'owner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT group_members_unique UNIQUE (group_id, user_id)
);

-- Indexes
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);

-- updated_at trigger
CREATE TRIGGER trigger_group_members_updated_at
  BEFORE UPDATE ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- 3. RLS policies — groups
-- =============================================================================

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- All authenticated users can browse active groups
CREATE POLICY "authenticated_can_view_active_groups"
  ON groups FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only admins can create groups
CREATE POLICY "admins_can_create_groups"
  ON groups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update groups
CREATE POLICY "admins_can_update_groups"
  ON groups FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete groups (soft delete preferred, but allow hard delete for cleanup)
CREATE POLICY "admins_can_delete_groups"
  ON groups FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================================================
-- 4. RLS policies — group_members
-- =============================================================================

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- All authenticated users can see group membership
CREATE POLICY "authenticated_can_view_group_members"
  ON group_members FOR SELECT
  TO authenticated
  USING (true);

-- Verified users can join groups (insert self only, group must be active)
CREATE POLICY "verified_users_can_join_groups"
  ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND verification_status = 'verified'
    )
    AND EXISTS (
      SELECT 1 FROM groups
      WHERE id = group_id AND is_active = true
    )
  );

-- Users can leave groups (delete self), admins can remove anyone
CREATE POLICY "users_can_leave_or_admins_remove"
  ON group_members FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
