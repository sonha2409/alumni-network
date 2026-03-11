"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

/**
 * Snooze the staleness banner for 30 days.
 */
export async function snoozeStalenessBanner(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ staleness_nudge_snoozed_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) {
    console.error("[ServerAction:snoozeStalenessBanner]", {
      userId: user.id,
      error: error.message,
    });
    return { success: false, error: "Failed to snooze reminder." };
  }

  revalidatePath("/", "layout");
  return { success: true, data: undefined };
}

/**
 * Mark the profile as current without changing any fields.
 * Touches updated_at to reset the staleness clock.
 */
export async function confirmProfileCurrent(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({
      updated_at: now,
      last_profile_update_at: now,
      staleness_nudge_snoozed_at: null,
    })
    .eq("user_id", user.id);

  if (error) {
    console.error("[ServerAction:confirmProfileCurrent]", {
      userId: user.id,
      error: error.message,
    });
    return { success: false, error: "Failed to confirm profile." };
  }

  revalidatePath("/", "layout");
  return { success: true, data: undefined };
}
