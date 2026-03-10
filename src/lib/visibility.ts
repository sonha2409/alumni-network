import { createClient } from "@/lib/supabase/server";
import { getRelationshipInfo } from "@/lib/queries/connections";
import type { DirectoryProfile, ProfileVisibilityTier } from "@/lib/types";

/**
 * Determine the visibility tier for a viewer looking at a target user's profile.
 *
 * - tier3_connected: own profile, admin/moderator, or connected user
 * - tier2_verified: verified user who is not connected
 * - tier1_unverified: unverified user
 */
export async function getVisibilityTier(
  viewerUserId: string,
  targetUserId: string
): Promise<ProfileVisibilityTier> {
  // Own profile → full access
  if (viewerUserId === targetUserId) return "tier3_connected";

  const supabase = await createClient();

  // Fetch viewer's role + verification status
  const { data: viewer } = await supabase
    .from("users")
    .select("role, verification_status")
    .eq("id", viewerUserId)
    .single();

  if (!viewer) return "tier1_unverified";

  // Admin/moderator → full access
  if (viewer.role === "admin" || viewer.role === "moderator") {
    return "tier3_connected";
  }

  // Not verified → tier 1
  if (viewer.verification_status !== "verified") {
    return "tier1_unverified";
  }

  // Verified — check connection
  const relationship = await getRelationshipInfo(viewerUserId, targetUserId);
  if (relationship.status === "connected") {
    return "tier3_connected";
  }

  return "tier2_verified";
}

/**
 * Filter a directory profile for Tier 1 viewers.
 * Strips fields that unverified users should not see.
 * Tier 2+ profiles are returned unchanged.
 */
export function filterDirectoryProfileForTier(
  profile: DirectoryProfile,
  tier: ProfileVisibilityTier
): DirectoryProfile {
  if (tier !== "tier1_unverified") return profile;

  return {
    ...profile,
    bio: null,
    country: null,
    state_province: null,
    city: null,
    current_job_title: null,
    current_company: null,
    availability_tags: [],
  };
}
