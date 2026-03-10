"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Track a profile view. Fire-and-forget — errors are logged but not surfaced.
 * Deduplicated per viewer per profile per day via unique index.
 */
export async function trackProfileView(profileId: string): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Get the profile to find its owner — don't track self-views
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("id", profileId)
      .single();

    if (!profile || profile.user_id === user.id) return;

    // Insert view — unique index will silently reject duplicates within same day
    await supabase
      .from("profile_views")
      .insert({
        profile_id: profileId,
        viewer_id: user.id,
      });
  } catch (err) {
    // Fire-and-forget: log but don't throw
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:trackProfileView]", { profileId, error: message });
  }
}
