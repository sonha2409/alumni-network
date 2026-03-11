-- Migration: Create message attachments table and storage bucket
-- Feature: Message Attachments (Media & File Sharing)

-- =============================================================================
-- 1. message_attachments table
-- =============================================================================

CREATE TABLE public.message_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL REFERENCES public.users(id),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  content_type text NOT NULL,
  attachment_type text NOT NULL CHECK (attachment_type IN ('image', 'document')),
  width integer,
  height integer,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  storage_deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER handle_message_attachments_updated_at
  BEFORE UPDATE ON public.message_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 2. Indexes
-- =============================================================================

-- Fetch attachments for a message
CREATE INDEX idx_message_attachments_message_id
  ON public.message_attachments(message_id);

-- Pending purge: soft-deleted but not yet removed from storage
CREATE INDEX idx_message_attachments_pending_purge
  ON public.message_attachments(deleted_at)
  WHERE is_deleted = true AND storage_deleted_at IS NULL;

-- User storage quota queries
CREATE INDEX idx_message_attachments_uploader_id
  ON public.message_attachments(uploader_id)
  WHERE is_deleted = false;

-- =============================================================================
-- 3. RLS Policies
-- =============================================================================

ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- SELECT: conversation participants only
CREATE POLICY "message_attachments_select_participant"
  ON public.message_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
        AND public.is_conversation_participant(m.conversation_id, auth.uid())
    )
  );

-- INSERT: uploader must be the authenticated user
CREATE POLICY "message_attachments_insert_own"
  ON public.message_attachments FOR INSERT
  WITH CHECK (
    uploader_id = auth.uid()
  );

-- UPDATE: uploader only (for soft delete)
CREATE POLICY "message_attachments_update_own"
  ON public.message_attachments FOR UPDATE
  USING (
    uploader_id = auth.uid()
  );

-- =============================================================================
-- 4. Storage bucket: message-attachments (private)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  false,
  5242880, -- 5MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv'
  ]
);

-- Storage INSERT policy: users upload to their own folder
CREATE POLICY "message_attachments_storage_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage SELECT policy: conversation participants can view
CREATE POLICY "message_attachments_storage_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'message-attachments'
    AND (
      -- Own files
      auth.uid()::text = (storage.foldername(name))[1]
      OR
      -- Conversation participant (conversation_id is second folder segment)
      public.is_conversation_participant(
        (storage.foldername(name))[2]::uuid,
        auth.uid()
      )
    )
  );

-- Storage DELETE policy: own files only
CREATE POLICY "message_attachments_storage_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'message-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================================================
-- 5. Helper function: get user storage used
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_storage_used(uid uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(file_size), 0)::bigint
  FROM public.message_attachments
  WHERE uploader_id = uid AND is_deleted = false;
$$;

-- =============================================================================
-- 6. Helper function: get conversation attachments (paginated)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_conversation_attachments(
  p_conversation_id uuid,
  p_attachment_type text DEFAULT NULL,
  p_cursor timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  message_id uuid,
  uploader_id uuid,
  file_name text,
  file_path text,
  file_size integer,
  content_type text,
  attachment_type text,
  width integer,
  height integer,
  created_at timestamptz,
  sender_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    ma.id,
    ma.message_id,
    ma.uploader_id,
    ma.file_name,
    ma.file_path,
    ma.file_size,
    ma.content_type,
    ma.attachment_type,
    ma.width,
    ma.height,
    ma.created_at,
    p.full_name AS sender_name
  FROM public.message_attachments ma
  JOIN public.messages m ON m.id = ma.message_id
  JOIN public.profiles p ON p.user_id = ma.uploader_id
  WHERE m.conversation_id = p_conversation_id
    AND ma.is_deleted = false
    AND (p_attachment_type IS NULL OR ma.attachment_type = p_attachment_type)
    AND (p_cursor IS NULL OR ma.created_at < p_cursor)
    AND public.is_conversation_participant(p_conversation_id, auth.uid())
  ORDER BY ma.created_at DESC
  LIMIT p_limit;
$$;
