import { createClient } from "@supabase/supabase-js";

/**
 * Create a Supabase client with the service role key.
 * Bypasses RLS — use only for server-side operations that require
 * elevated privileges (e.g., unsubscribe without auth session).
 *
 * NEVER expose this client or the service role key to the browser.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
