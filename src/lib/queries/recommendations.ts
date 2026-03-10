import { createClient } from "@/lib/supabase/server";
import type { RecommendedProfile } from "@/lib/types";

/**
 * Get recommended alumni for a user using rule-based scoring.
 * Calls the Postgres function `get_recommended_alumni` which scores by
 * specialization, industry, location, grad year, company, availability, and mutual connections.
 *
 * Falls back to recently active verified alumni if no scored results.
 */
export async function getRecommendedAlumni(
  userId: string,
  limit: number = 20
): Promise<RecommendedProfile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_recommended_alumni", {
    p_user_id: userId,
    p_limit: limit,
  });

  if (error) {
    console.error("[Query:getRecommendedAlumni]", {
      userId,
      error: error.message,
    });
    return [];
  }

  if (!data || data.length === 0) {
    return getFallbackAlumni(userId, limit);
  }

  const profileIds = data.map(
    (r: Record<string, unknown>) => r.profile_id as string
  );

  // Fetch current career entries and availability tags (same pattern as directory.ts)
  const [careerMap, tagsMap] = await Promise.all([
    fetchCurrentCareers(profileIds),
    fetchAvailabilityTags(profileIds),
  ]);

  return data.map((r: Record<string, unknown>) => {
    const id = r.profile_id as string;
    const career = careerMap[id];
    return {
      id,
      user_id: r.user_id as string,
      full_name: r.full_name as string,
      photo_url: r.photo_url as string | null,
      graduation_year: r.graduation_year as number,
      country: r.country as string | null,
      state_province: r.state_province as string | null,
      city: r.city as string | null,
      bio: r.bio as string | null,
      has_contact_details: (r.has_contact_details as boolean) ?? false,
      last_active_at: r.last_active_at as string,
      primary_industry: r.primary_industry_name
        ? {
            id: r.primary_industry_id as string,
            name: r.primary_industry_name as string,
          }
        : null,
      primary_specialization: r.primary_specialization_name
        ? {
            id: r.primary_specialization_id as string,
            name: r.primary_specialization_name as string,
          }
        : null,
      current_job_title: career?.job_title ?? null,
      current_company: career?.company ?? null,
      availability_tags: tagsMap[id] ?? [],
      score: r.score as number,
    };
  });
}

/**
 * Fallback: return recently active verified alumni when scoring produces no results.
 * This handles cold-start for new users with sparse profiles.
 */
async function getFallbackAlumni(
  userId: string,
  limit: number
): Promise<RecommendedProfile[]> {
  const supabase = await createClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      user_id,
      full_name,
      photo_url,
      graduation_year,
      country,
      state_province,
      city,
      bio,
      has_contact_details,
      last_active_at,
      primary_industry:industries!profiles_primary_industry_id_fkey(id, name),
      primary_specialization:specializations!profiles_primary_specialization_id_fkey(id, name),
      users!inner(verification_status, is_active)
    `
    )
    .neq("user_id", userId)
    .eq("users.verification_status", "verified")
    .eq("users.is_active", true)
    .order("last_active_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error || !profiles) {
    console.error("[Query:getFallbackAlumni]", {
      userId,
      error: error?.message,
    });
    return [];
  }

  const profileIds = profiles.map(
    (p: Record<string, unknown>) => p.id as string
  );
  const [careerMap, tagsMap] = await Promise.all([
    fetchCurrentCareers(profileIds),
    fetchAvailabilityTags(profileIds),
  ]);

  return profiles.map((p: Record<string, unknown>) => {
    const id = p.id as string;
    const career = careerMap[id];
    return {
      id,
      user_id: p.user_id as string,
      full_name: p.full_name as string,
      photo_url: p.photo_url as string | null,
      graduation_year: p.graduation_year as number,
      country: p.country as string | null,
      state_province: p.state_province as string | null,
      city: p.city as string | null,
      bio: p.bio as string | null,
      has_contact_details: (p.has_contact_details as boolean) ?? false,
      last_active_at: p.last_active_at as string,
      primary_industry: p.primary_industry as {
        id: string;
        name: string;
      } | null,
      primary_specialization: p.primary_specialization as {
        id: string;
        name: string;
      } | null,
      current_job_title: career?.job_title ?? null,
      current_company: career?.company ?? null,
      availability_tags: tagsMap[id] ?? [],
      score: 0,
    };
  });
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

async function fetchCurrentCareers(
  profileIds: string[]
): Promise<Record<string, { job_title: string; company: string }>> {
  if (profileIds.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("career_entries")
    .select("profile_id, job_title, company")
    .in("profile_id", profileIds)
    .eq("is_current", true);

  const map: Record<string, { job_title: string; company: string }> = {};
  if (data) {
    for (const entry of data) {
      if (!map[entry.profile_id]) {
        map[entry.profile_id] = {
          job_title: entry.job_title,
          company: entry.company,
        };
      }
    }
  }
  return map;
}

async function fetchAvailabilityTags(
  profileIds: string[]
): Promise<Record<string, { id: string; name: string; slug: string }[]>> {
  if (profileIds.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_availability_tags")
    .select("profile_id, tag_type:availability_tag_types(id, name, slug)")
    .in("profile_id", profileIds);

  const map: Record<string, { id: string; name: string; slug: string }[]> = {};
  if (data) {
    for (const row of data) {
      const tag = (row as Record<string, unknown>).tag_type as {
        id: string;
        name: string;
        slug: string;
      } | null;
      if (tag) {
        if (!map[row.profile_id]) {
          map[row.profile_id] = [];
        }
        map[row.profile_id].push(tag);
      }
    }
  }
  return map;
}
