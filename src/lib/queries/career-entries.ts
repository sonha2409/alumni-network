"use server";

import { createClient } from "@/lib/supabase/server";
import type { CareerEntry, CareerEntryWithIndustry } from "@/lib/types";

/**
 * Fetch all career entries for a profile, ordered by is_current DESC, start_date DESC.
 */
export async function getCareerEntriesByProfileId(
  profileId: string
): Promise<CareerEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("career_entries")
    .select("*")
    .eq("profile_id", profileId)
    .order("is_current", { ascending: false })
    .order("start_date", { ascending: false });

  if (error) {
    console.error("[Query:getCareerEntriesByProfileId]", {
      profileId,
      error: error.message,
    });
    return [];
  }

  return data as CareerEntry[];
}

/**
 * Fetch career entries with joined industry/specialization names.
 */
export async function getCareerEntriesWithIndustry(
  profileId: string
): Promise<CareerEntryWithIndustry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("career_entries")
    .select(
      `
      *,
      industry:industries(*),
      specialization:specializations(*)
    `
    )
    .eq("profile_id", profileId)
    .order("is_current", { ascending: false })
    .order("start_date", { ascending: false });

  if (error) {
    console.error("[Query:getCareerEntriesWithIndustry]", {
      profileId,
      error: error.message,
    });
    return [];
  }

  return data as CareerEntryWithIndustry[];
}
