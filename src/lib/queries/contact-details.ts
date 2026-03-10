import { createClient } from "@/lib/supabase/server";
import type { ProfileContactDetails } from "@/lib/types";

/**
 * Fetch contact details for a profile. RLS enforces access control —
 * only the owner, connected users, and admins/moderators will get data.
 */
export async function getContactDetailsByProfileId(
  profileId: string
): Promise<ProfileContactDetails | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profile_contact_details")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    console.error("[Query:getContactDetailsByProfileId]", {
      profileId,
      error: error.message,
    });
    return null;
  }

  return data as ProfileContactDetails | null;
}
