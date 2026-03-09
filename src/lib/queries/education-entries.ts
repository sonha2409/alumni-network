"use server";

import { createClient } from "@/lib/supabase/server";
import type { EducationEntry } from "@/lib/types";

/**
 * Fetch all education entries for a profile, ordered by end_year DESC, start_year DESC.
 */
export async function getEducationEntriesByProfileId(
  profileId: string
): Promise<EducationEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("education_entries")
    .select("*")
    .eq("profile_id", profileId)
    .order("end_year", { ascending: false, nullsFirst: false })
    .order("start_year", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("[Query:getEducationEntriesByProfileId]", {
      profileId,
      error: error.message,
    });
    return [];
  }

  return data as EducationEntry[];
}
