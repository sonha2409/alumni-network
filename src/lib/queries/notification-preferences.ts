import { createClient } from "@/lib/supabase/server";
import type { NotificationType, NotificationPreference } from "@/lib/types";

/**
 * Check if email is enabled for a given user + notification type.
 * Returns true if no preference row exists (default = enabled).
 */
export async function isEmailEnabled(
  userId: string,
  type: NotificationType
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("email_enabled")
    .eq("user_id", userId)
    .eq("notification_type", type)
    .maybeSingle();

  if (error) {
    console.error("[Query:isEmailEnabled]", {
      userId,
      type,
      error: error.message,
    });
    // Default to enabled on error — better to send an extra email than miss one
    return true;
  }

  // No row = default enabled
  if (!data) return true;

  return data.email_enabled;
}

/**
 * Get all notification preferences for a user.
 * Returns only explicitly set preferences (missing = default enabled).
 */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreference[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("[Query:getNotificationPreferences]", {
      userId,
      error: error.message,
    });
    return [];
  }

  return (data as NotificationPreference[]) ?? [];
}

/**
 * Get the email address for a user from public.users.
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("email")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("[Query:getUserEmail]", {
      userId,
      error: error.message,
    });
    return null;
  }

  return data?.email ?? null;
}
