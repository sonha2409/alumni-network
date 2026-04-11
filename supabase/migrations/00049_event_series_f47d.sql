-- =============================================================================
-- Migration 00049: Recurring events / event series (F47d)
-- New table: event_series
-- New columns on events: series_id, series_index
-- RLS policies for event_series
-- =============================================================================

-- =============================================================================
-- 1. event_series table
-- =============================================================================
CREATE TABLE public.event_series (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rrule         TEXT NOT NULL CHECK (rrule IN ('weekly', 'monthly')),
  interval_val  SMALLINT NOT NULL DEFAULT 1 CHECK (interval_val BETWEEN 1 AND 4),
  until_date    DATE NOT NULL,
  base_title    TEXT NOT NULL,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT event_series_title_len CHECK (char_length(base_title) BETWEEN 3 AND 140)
);

CREATE INDEX idx_event_series_creator
  ON public.event_series(creator_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trigger_event_series_updated_at
  BEFORE UPDATE ON public.event_series
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 2. Add series columns to events
-- =============================================================================
ALTER TABLE public.events
  ADD COLUMN series_id UUID REFERENCES public.event_series(id) ON DELETE SET NULL,
  ADD COLUMN series_index SMALLINT;

CREATE INDEX idx_events_series ON public.events(series_id)
  WHERE series_id IS NOT NULL AND deleted_at IS NULL;

-- =============================================================================
-- 3. RLS for event_series
-- =============================================================================
ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;

-- Authenticated users can see non-deleted series
CREATE POLICY "event_series_select_auth"
  ON public.event_series FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Creator can insert their own series
CREATE POLICY "event_series_insert_creator"
  ON public.event_series FOR INSERT
  TO authenticated
  WITH CHECK (
    creator_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND verification_status = 'verified'
    )
  );

-- Creator can update their own series
CREATE POLICY "event_series_update_creator"
  ON public.event_series FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Creator can delete their own series
CREATE POLICY "event_series_delete_creator"
  ON public.event_series FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());

-- =============================================================================
-- 4. RLS fix: allow creator to see own soft-deleted series (for cancel flow)
-- =============================================================================
CREATE POLICY "event_series_select_own_deleted"
  ON public.event_series FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

-- =============================================================================
-- 5. Helper: get sibling occurrences for a series event
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_series_occurrences(p_series_id UUID)
RETURNS TABLE (
  id UUID,
  series_index SMALLINT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  title TEXT,
  deleted_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.series_index, e.start_time, e.end_time, e.title, e.deleted_at
  FROM public.events e
  WHERE e.series_id = p_series_id
  ORDER BY e.series_index ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_series_occurrences(UUID) TO authenticated;
