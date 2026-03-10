import { createClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/lib/types";

/**
 * Create a notification for a user.
 * Uses the SECURITY DEFINER `create_notification` function
 * so that notifications can only be created server-side.
 *
 * This is a fire-and-forget helper — errors are logged but don't
 * propagate to the caller. Notification failures should never
 * block the primary action (e.g., sending a connection request).
 */
export async function notifyUser(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string
): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.rpc("create_notification", {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_body: body,
      p_link: link ?? null,
    });

    if (error) {
      console.error("[notifyUser]", {
        userId,
        type,
        error: error.message,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[notifyUser]", { userId, type, error: message });
  }
}
