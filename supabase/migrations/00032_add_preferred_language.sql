-- Add preferred_language column to users table for i18n support
ALTER TABLE public.users
  ADD COLUMN preferred_language text NOT NULL DEFAULT 'en'
  CONSTRAINT users_preferred_language_check CHECK (preferred_language IN ('en', 'vi'));

-- Update the handle_updated_at trigger (already exists on users table)
-- No additional trigger needed
