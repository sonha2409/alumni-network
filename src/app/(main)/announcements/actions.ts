"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function dismissAnnouncement(
  announcementId: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  if (!announcementId) {
    return { success: false, error: "Announcement ID is required." };
  }

  try {
    const { error } = await supabase
      .from("dismissed_announcements")
      .upsert(
        { user_id: user.id, announcement_id: announcementId },
        { onConflict: "user_id,announcement_id" }
      );

    if (error) {
      console.error("[ServerAction:dismissAnnouncement]", {
        userId: user.id,
        error: error.message,
      });
      return { success: false, error: "Failed to dismiss announcement." };
    }

    return { success: true, data: undefined };
  } catch (err) {
    console.error("[ServerAction:dismissAnnouncement]", {
      userId: user.id,
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return { success: false, error: "An unexpected error occurred." };
  }
}
