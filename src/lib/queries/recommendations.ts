import { createClient } from "@/lib/supabase/server";
import type { RecommendedProfile, PopularProfile } from "@/lib/types";

/**
 * Get recommended alumni for a user using rule-based scoring.
 * Calls the Postgres function `get_recommended_alumni` which scores by
 * specialization, industry, location, grad year, company, availability, and mutual connections.
 *
 * Cold-start detection (profile_completeness < 40) is handled internally by the RPC.
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

  return data.map((r: Record<string, unknown>) => {
    const tagIds = (r.availability_tag_ids as string[]) ?? [];
    const tagNames = (r.availability_tag_names as string[]) ?? [];
    const tagSlugs = (r.availability_tag_slugs as string[]) ?? [];

    return {
      id: r.profile_id as string,
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
      current_job_title: (r.current_title as string) ?? null,
      current_company: (r.current_company as string) ?? null,
      availability_tags: tagIds.map((id, i) => ({
        id,
        name: tagNames[i],
        slug: tagSlugs[i],
      })),
      score: r.score as number,
    };
  });
}

/**
 * Get popular alumni ranked by composite score:
 * views (30 days) + connections * 3 + recency bonus.
 */
export async function getPopularAlumni(
  userId: string,
  limit: number = 10
): Promise<PopularProfile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_popular_alumni", {
    p_user_id: userId,
    p_limit: limit,
  });

  if (error) {
    console.error("[Query:getPopularAlumni]", {
      userId,
      error: error.message,
    });
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map((r: Record<string, unknown>) => {
    const tagIds = (r.availability_tag_ids as string[]) ?? [];
    const tagNames = (r.availability_tag_names as string[]) ?? [];
    const tagSlugs = (r.availability_tag_slugs as string[]) ?? [];

    return {
      id: r.profile_id as string,
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
      current_job_title: (r.current_title as string) ?? null,
      current_company: (r.current_company as string) ?? null,
      availability_tags: tagIds.map((id, i) => ({
        id,
        name: tagNames[i],
        slug: tagSlugs[i],
      })),
      popularity_score: Number(r.popularity_score) || 0,
      view_count: Number(r.view_count) || 0,
      connection_count: Number(r.connection_count) || 0,
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
      career_entries(job_title, company),
      user_availability_tags(tag_type:availability_tag_types(id, name, slug)),
      users!inner(verification_status, is_active)
    `
    )
    .neq("user_id", userId)
    .eq("users.verification_status", "verified")
    .eq("users.is_active", true)
    .eq("career_entries.is_current", true)
    .order("last_active_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error || !profiles) {
    console.error("[Query:getFallbackAlumni]", {
      userId,
      error: error?.message,
    });
    return [];
  }

  return profiles.map((p: Record<string, unknown>) => {
    const careers = (p.career_entries as { job_title: string; company: string }[] | null) ?? [];
    const career = careers[0] ?? null;
    const rawTags = (p.user_availability_tags as { tag_type: { id: string; name: string; slug: string } | null }[] | null) ?? [];
    const tags = rawTags
      .map((t) => t.tag_type)
      .filter((t): t is { id: string; name: string; slug: string } => t !== null);

    return {
      id: p.id as string,
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
      availability_tags: tags,
      score: 0,
    };
  });
}

