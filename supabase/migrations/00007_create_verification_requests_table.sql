-- =============================================================================
-- Migration: Create verification_requests table
-- Feature: Alumni Verification (F2) + Admin Verification Queue (F11)
-- =============================================================================

-- verification_requests table
CREATE TABLE public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  graduation_year integer NOT NULL,
  student_id text,
  degree_program text NOT NULL,
  supporting_info text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.users(id),
  review_message text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index: lookup by user_id (user's own requests)
CREATE INDEX idx_verification_requests_user_id
  ON public.verification_requests(user_id);

-- Index: admin queue queries (pending requests ordered by date)
CREATE INDEX idx_verification_requests_status_created
  ON public.verification_requests(status, created_at DESC);

-- updated_at trigger (reuses existing handle_updated_at function)
CREATE TRIGGER on_verification_requests_updated
  BEFORE UPDATE ON public.verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- RLS Policies
-- =============================================================================
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own verification requests
CREATE POLICY verification_requests_select_own
  ON public.verification_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own verification requests
CREATE POLICY verification_requests_insert_own
  ON public.verification_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all verification requests
CREATE POLICY verification_requests_admin_select
  ON public.verification_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update verification requests (approve/reject)
CREATE POLICY verification_requests_admin_update
  ON public.verification_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
