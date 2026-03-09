import { createClient } from "@/lib/supabase/server";
import type { Profile, ProfileWithIndustry } from "@/lib/types";

/**
 * Fetch a profile by user ID.
 */
export async function getProfileByUserId(
  userId: string
): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // No rows found
    console.error("[Query:getProfileByUserId]", {
      userId,
      error: error.message,
    });
    return null;
  }

  return data as Profile;
}

/**
 * Fetch a profile by profile ID with joined industry/specialization data.
 */
export async function getProfileWithIndustry(
  profileId: string
): Promise<ProfileWithIndustry | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      *,
      primary_industry:industries!profiles_primary_industry_id_fkey(*),
      primary_specialization:specializations!profiles_primary_specialization_id_fkey(*),
      secondary_industry:industries!profiles_secondary_industry_id_fkey(*),
      secondary_specialization:specializations!profiles_secondary_specialization_id_fkey(*)
    `
    )
    .eq("id", profileId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[Query:getProfileWithIndustry]", {
      profileId,
      error: error.message,
    });
    return null;
  }

  return data as ProfileWithIndustry;
}

/**
 * Fetch a profile by user ID with joined industry/specialization data.
 */
export async function getProfileWithIndustryByUserId(
  userId: string
): Promise<ProfileWithIndustry | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      *,
      primary_industry:industries!profiles_primary_industry_id_fkey(*),
      primary_specialization:specializations!profiles_primary_specialization_id_fkey(*),
      secondary_industry:industries!profiles_secondary_industry_id_fkey(*),
      secondary_specialization:specializations!profiles_secondary_specialization_id_fkey(*)
    `
    )
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[Query:getProfileWithIndustryByUserId]", {
      userId,
      error: error.message,
    });
    return null;
  }

  return data as ProfileWithIndustry;
}

/**
 * Check if a user has a profile (lightweight check).
 */
export async function hasProfile(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    console.error("[Query:hasProfile]", { userId, error: error.message });
    return false;
  }

  return (count ?? 0) > 0;
}
