import { createClient } from "@/lib/supabase/server";

/**
 * F45: Fetch the gated "last seen" timestamp for another user.
 *
 * Returns ISO string on success, or `null` when:
 *   - viewer is not authenticated
 *   - the privacy gate fails (not connected, no two-way message history, or
 *     the target toggled `show_last_active` off)
 *   - the target has never been touched (edge case, pre-F45 accounts)
 *
 * Callers cannot distinguish "hidden" from "never online" — the three
 * outcomes collapse into `null`, matching WhatsApp's behavior.
 *
 * The underlying `get_last_seen` RPC is SECURITY DEFINER and enforces the
 * visibility gate server-side; this helper is a thin wrapper with typed
 * error logging.
 */
export async function getLastSeenFor(
  targetUserId: string
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_last_seen", {
    p_target: targetUserId,
  });

  if (error) {
    console.error("[Query:getLastSeenFor]", {
      targetUserId,
      error: error.message,
    });
    return null;
  }

  return (data as string | null) ?? null;
}
