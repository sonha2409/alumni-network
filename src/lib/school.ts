import { createClient } from "@/lib/supabase/server";
import type { School } from "@/lib/types";

/**
 * Fetch the active school record.
 * Single-row query — fast enough without caching.
 * Cannot use unstable_cache because createClient() reads cookies().
 */
export async function getSchool(): Promise<School> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schools")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error("Failed to load school data");
  }

  return data as School;
}
