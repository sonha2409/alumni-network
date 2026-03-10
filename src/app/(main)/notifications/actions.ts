"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/queries/notifications";
import type { ActionResult, Notification } from "@/lib/types";

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(
  notificationId: string
): Promise<ActionResult> {
  const parsed = z
    .string()
    .uuid("Invalid notification ID")
    .safeParse(notificationId);
  if (!parsed.success) {
    return { success: false, error: "Invalid notification ID." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[ServerAction:markNotificationRead]", {
        userId: user.id,
        notificationId,
        error: error.message,
      });
      return { success: false, error: "Failed to mark notification as read." };
    }

    revalidatePath("/notifications");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:markNotificationRead]", {
      userId: user.id,
      error: message,
    });
    return { success: false, error: "Something went wrong." };
  }
}

/**
 * Mark all notifications as read for the current user.
 */
export async function markAllNotificationsRead(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      console.error("[ServerAction:markAllNotificationsRead]", {
        userId: user.id,
        error: error.message,
      });
      return {
        success: false,
        error: "Failed to mark notifications as read.",
      };
    }

    revalidatePath("/notifications");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:markAllNotificationsRead]", {
      userId: user.id,
      error: message,
    });
    return { success: false, error: "Something went wrong." };
  }
}

/**
 * Delete a single notification.
 */
export async function deleteNotification(
  notificationId: string
): Promise<ActionResult> {
  const parsed = z
    .string()
    .uuid("Invalid notification ID")
    .safeParse(notificationId);
  if (!parsed.success) {
    return { success: false, error: "Invalid notification ID." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[ServerAction:deleteNotification]", {
        userId: user.id,
        notificationId,
        error: error.message,
      });
      return { success: false, error: "Failed to delete notification." };
    }

    revalidatePath("/notifications");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:deleteNotification]", {
      userId: user.id,
      error: message,
    });
    return { success: false, error: "Something went wrong." };
  }
}

/**
 * Fetch a page of notifications (for client-side pagination).
 */
export async function fetchNotificationsPage(
  page: number,
  pageSize = 20,
  unreadOnly = false
): Promise<ActionResult<{ data: Notification[]; totalCount: number }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const result = await getNotifications(user.id, page, pageSize, unreadOnly);
  return { success: true, data: result };
}
