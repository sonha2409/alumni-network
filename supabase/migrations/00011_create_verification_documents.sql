-- =============================================================================
-- Migration 00011: Verification document uploads
-- Storage bucket + verification_documents table for proof files
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Storage bucket (private — only owner + admins can read)
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false);

-- Users can upload to their own folder: verification-documents/{user_id}/...
CREATE POLICY verification_docs_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'verification-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can read their own files
CREATE POLICY verification_docs_select_owner ON storage.objects
  FOR SELECT USING (
    bucket_id = 'verification-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admins can read all verification documents
CREATE POLICY verification_docs_select_admin ON storage.objects
  FOR SELECT USING (
    bucket_id = 'verification-documents'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can delete their own files (e.g., when re-submitting)
CREATE POLICY verification_docs_delete_owner ON storage.objects
  FOR DELETE USING (
    bucket_id = 'verification-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- -----------------------------------------------------------------------------
-- 2. verification_documents table
-- -----------------------------------------------------------------------------

CREATE TABLE public.verification_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id uuid NOT NULL REFERENCES public.verification_requests(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  content_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fetching documents by request
CREATE INDEX idx_verification_documents_request_id
  ON public.verification_documents(request_id);

-- -----------------------------------------------------------------------------
-- 3. RLS policies
-- -----------------------------------------------------------------------------

ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;

-- Users can view documents on their own requests
CREATE POLICY verification_documents_select_owner
  ON public.verification_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.verification_requests
      WHERE id = request_id AND user_id = auth.uid()
    )
  );

-- Users can insert documents for their own requests
CREATE POLICY verification_documents_insert_owner
  ON public.verification_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.verification_requests
      WHERE id = request_id AND user_id = auth.uid()
    )
  );

-- Admins can view all documents
CREATE POLICY verification_documents_select_admin
  ON public.verification_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
