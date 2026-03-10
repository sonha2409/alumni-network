"use server";

import { createClient } from "@/lib/supabase/server";
import { calculateProfileCompleteness } from "@/lib/profile-completeness";

/**
 * Recalculate and update profile completeness for a given profile.
 * Call this after adding/removing career entries, education entries, or availability tags.
 */
export async function recalculateProfileCompleteness(
  profileId: string
): Promise<void> {
  const supabase = await createClient();

  // Fetch profile fields
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "full_name, graduation_year, primary_industry_id, photo_url, bio, primary_specialization_id, country, state_province, city, secondary_industry_id, secondary_specialization_id, has_contact_details"
    )
    .eq("id", profileId)
    .single();

  if (profileError || !profile) {
    console.error("[recalculateProfileCompleteness]", {
      profileId,
      error: profileError?.message,
    });
    return;
  }

  // Check for related entries
  const [careerResult, educationResult, tagsResult] = await Promise.all([
    supabase
      .from("career_entries")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId),
    supabase
      .from("education_entries")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId),
    supabase
      .from("user_availability_tags")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId),
  ]);

  const completeness = calculateProfileCompleteness({
    ...profile,
    has_career_entries: (careerResult.count ?? 0) > 0,
    has_education_entries: (educationResult.count ?? 0) > 0,
    has_availability_tags: (tagsResult.count ?? 0) > 0,
    has_contact_details: profile.has_contact_details ?? false,
  });

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ profile_completeness: completeness })
    .eq("id", profileId);

  if (updateError) {
    console.error("[recalculateProfileCompleteness]", {
      profileId,
      error: updateError.message,
    });
  }
}
