"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { recalculateProfileCompleteness } from "@/lib/profile-completeness-updater";
import type { ActionResult } from "@/lib/types";

async function getOwnProfileId(): Promise<{
  profileId: string;
  userId: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) return null;
  return { profileId: profile.id, userId: user.id };
}

export async function updateAvailabilityTags(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const auth = await getOwnProfileId();
  if (!auth) {
    return { success: false, error: "You must be logged in." };
  }

  // Get selected tag IDs from form (checkboxes send multiple values for the same name)
  const tagTypeIds = formData.getAll("tag_type_ids").map(String).filter(Boolean);

  const supabase = await createClient();

  try {
    // Delete all existing tags for this profile
    const { error: deleteError } = await supabase
      .from("user_availability_tags")
      .delete()
      .eq("profile_id", auth.profileId);

    if (deleteError) {
      console.error("[ServerAction:updateAvailabilityTags]", {
        userId: auth.userId,
        error: deleteError.message,
      });
      return { success: false, error: "Something went wrong. Please try again." };
    }

    // Insert new tags if any selected
    if (tagTypeIds.length > 0) {
      const rows = tagTypeIds.map((tagTypeId) => ({
        profile_id: auth.profileId,
        tag_type_id: tagTypeId,
      }));

      const { error: insertError } = await supabase
        .from("user_availability_tags")
        .insert(rows);

      if (insertError) {
        console.error("[ServerAction:updateAvailabilityTags]", {
          userId: auth.userId,
          error: insertError.message,
        });
        return { success: false, error: "Something went wrong. Please try again." };
      }
    }

    await recalculateProfileCompleteness(auth.profileId);
    revalidatePath("/profile/edit");
    revalidatePath(`/profile/${auth.profileId}`);

    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:updateAvailabilityTags]", {
      userId: auth.userId,
      error: message,
    });
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
