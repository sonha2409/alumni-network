"use server";

import { createClient } from "@/lib/supabase/server";
import type { AvailabilityTagType } from "@/lib/types";

/**
 * Fetch all active (non-archived) availability tag types, sorted by sort_order.
 */
export async function getAvailabilityTagTypes(): Promise<AvailabilityTagType[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("availability_tag_types")
    .select("*")
    .eq("is_archived", false)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[Query:getAvailabilityTagTypes]", {
      error: error.message,
    });
    return [];
  }

  return data as AvailabilityTagType[];
}

/**
 * Fetch the tag type IDs that a profile currently has selected.
 */
export async function getAvailabilityTagIdsByProfileId(
  profileId: string
): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_availability_tags")
    .select("tag_type_id")
    .eq("profile_id", profileId);

  if (error) {
    console.error("[Query:getAvailabilityTagIdsByProfileId]", {
      profileId,
      error: error.message,
    });
    return [];
  }

  return data.map((row) => row.tag_type_id);
}

/**
 * Fetch full tag type objects for a profile (for display).
 */
export async function getAvailabilityTagsByProfileId(
  profileId: string
): Promise<AvailabilityTagType[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_availability_tags")
    .select("tag_type:availability_tag_types(*)")
    .eq("profile_id", profileId);

  if (error) {
    console.error("[Query:getAvailabilityTagsByProfileId]", {
      profileId,
      error: error.message,
    });
    return [];
  }

  return data
    .map((row) => (row as Record<string, unknown>).tag_type as AvailabilityTagType)
    .filter(Boolean)
    .sort((a, b) => a.sort_order - b.sort_order);
}
