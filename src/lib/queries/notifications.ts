import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/lib/types";

/**
 * Get the count of unread notifications for a user.
 */
export async function getUnreadNotificationCount(
  userId: string
): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    console.error("[Query:getUnreadNotificationCount]", {
      userId,
      error: error.message,
    });
    return 0;
  }

  return count ?? 0;
}

/**
 * Get recent notifications for the dropdown (limited count).
 */
export async function getRecentNotifications(
  userId: string,
  limit = 10
): Promise<Notification[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[Query:getRecentNotifications]", {
      userId,
      error: error.message,
    });
    return [];
  }

  return (data as Notification[]) ?? [];
}

/**
 * Get paginated notifications for the full notifications page.
 */
export async function getNotifications(
  userId: string,
  page: number,
  pageSize = 20,
  unreadOnly = false
): Promise<{ data: Notification[]; totalCount: number }> {
  const supabase = await createClient();

  let query = supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("user_id", userId);

  if (unreadOnly) {
    query = query.eq("is_read", false);
  }

  const offset = (page - 1) * pageSize;

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    console.error("[Query:getNotifications]", {
      userId,
      error: error.message,
    });
    return { data: [], totalCount: 0 };
  }

  return {
    data: (data as Notification[]) ?? [],
    totalCount: count ?? 0,
  };
}
