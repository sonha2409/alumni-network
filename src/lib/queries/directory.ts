import { createClient } from "@/lib/supabase/server";
import type {
  DirectoryFilters,
  DirectoryProfile,
  DirectoryResult,
} from "@/lib/types";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

/**
 * Search the alumni directory with filters, full-text search, and pagination.
 * Returns profiles with their current career info and availability tags.
 */
export async function searchDirectory(
  filters: DirectoryFilters
): Promise<DirectoryResult> {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, filters.pageSize ?? DEFAULT_PAGE_SIZE)
  );
  const offset = (page - 1) * pageSize;

  // Build the base query — select profiles with joined industry/specialization
  let query = supabase
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
      last_active_at,
      primary_industry:industries!profiles_primary_industry_id_fkey(id, name),
      primary_specialization:specializations!profiles_primary_specialization_id_fkey(id, name)
    `,
      { count: "exact" }
    );

  // Build a separate count query for the same filters
  let countQuery = supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  // Full-text search on name/bio via tsvector
  if (filters.query && filters.query.trim()) {
    const searchTerm = filters.query.trim();
    // Use websearch_to_tsquery for natural language input (handles special chars)
    query = query.textSearch("search_vector", searchTerm, {
      type: "websearch",
    });
    countQuery = countQuery.textSearch("search_vector", searchTerm, {
      type: "websearch",
    });
  }

  // Industry filter
  if (filters.industryId) {
    query = query.eq("primary_industry_id", filters.industryId);
    countQuery = countQuery.eq("primary_industry_id", filters.industryId);
  }

  // Specialization filter
  if (filters.specializationId) {
    query = query.eq("primary_specialization_id", filters.specializationId);
    countQuery = countQuery.eq(
      "primary_specialization_id",
      filters.specializationId
    );
  }

  // Graduation year range
  if (filters.graduationYearMin) {
    query = query.gte("graduation_year", filters.graduationYearMin);
    countQuery = countQuery.gte("graduation_year", filters.graduationYearMin);
  }
  if (filters.graduationYearMax) {
    query = query.lte("graduation_year", filters.graduationYearMax);
    countQuery = countQuery.lte("graduation_year", filters.graduationYearMax);
  }

  // Location filters
  if (filters.country) {
    query = query.ilike("country", filters.country);
    countQuery = countQuery.ilike("country", filters.country);
  }
  if (filters.stateProvince) {
    query = query.ilike("state_province", filters.stateProvince);
    countQuery = countQuery.ilike("state_province", filters.stateProvince);
  }
  if (filters.city) {
    query = query.ilike("city", filters.city);
    countQuery = countQuery.ilike("city", filters.city);
  }

  // Sort
  const sortBy = filters.sortBy ?? "name";
  const sortOrder = filters.sortOrder ?? "asc";
  const ascending = sortOrder === "asc";

  switch (sortBy) {
    case "graduation_year":
      query = query.order("graduation_year", { ascending });
      break;
    case "recently_active":
      query = query.order("last_active_at", {
        ascending: false,
        nullsFirst: false,
      });
      break;
    case "relevance":
      // For relevance, Supabase textSearch already orders by rank when no explicit order
      // Add name as secondary sort for stability
      query = query.order("full_name", { ascending: true });
      break;
    case "name":
    default:
      query = query.order("full_name", { ascending });
      break;
  }

  // Pagination
  query = query.range(offset, offset + pageSize - 1);

  // Execute both queries in parallel
  const [{ data: profiles, error, count }, { count: totalFromCount }] =
    await Promise.all([query, countQuery]);

  if (error) {
    console.error("[Query:searchDirectory]", { filters, error: error.message });
    return {
      profiles: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  const totalCount = count ?? totalFromCount ?? 0;

  // Fetch current career entries and availability tags for returned profiles
  const profileIds = (profiles ?? []).map(
    (p: Record<string, unknown>) => p.id as string
  );

  let careerMap: Record<string, { job_title: string; company: string }> = {};
  let tagsMap: Record<
    string,
    { id: string; name: string; slug: string }[]
  > = {};

  if (profileIds.length > 0) {
    const [careerResult, tagsResult] = await Promise.all([
      // Fetch current career entry (is_current = true) for each profile
      supabase
        .from("career_entries")
        .select("profile_id, job_title, company")
        .in("profile_id", profileIds)
        .eq("is_current", true),
      // Fetch availability tags with their type info
      supabase
        .from("user_availability_tags")
        .select("profile_id, tag_type:availability_tag_types(id, name, slug)")
        .in("profile_id", profileIds),
    ]);

    if (careerResult.data) {
      for (const entry of careerResult.data) {
        // Take the first current entry per profile
        if (!careerMap[entry.profile_id]) {
          careerMap[entry.profile_id] = {
            job_title: entry.job_title,
            company: entry.company,
          };
        }
      }
    }

    if (tagsResult.data) {
      for (const row of tagsResult.data) {
        const tag = (row as Record<string, unknown>).tag_type as {
          id: string;
          name: string;
          slug: string;
        } | null;
        if (tag) {
          if (!tagsMap[row.profile_id]) {
            tagsMap[row.profile_id] = [];
          }
          tagsMap[row.profile_id].push(tag);
        }
      }
    }
  }

  // If filtering by availability tags, do it after fetch
  // (Supabase JS client can't easily filter on junction table)
  let filteredProfiles = (profiles ?? []) as Record<string, unknown>[];

  if (
    filters.availabilityTagIds &&
    filters.availabilityTagIds.length > 0
  ) {
    const requiredTagIds = new Set(filters.availabilityTagIds);
    filteredProfiles = filteredProfiles.filter((p) => {
      const profileTags = tagsMap[p.id as string] ?? [];
      return profileTags.some((t) => requiredTagIds.has(t.id));
    });
  }

  // Map to DirectoryProfile shape
  const directoryProfiles: DirectoryProfile[] = filteredProfiles.map((p) => {
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
    };
  });

  return {
    profiles: directoryProfiles,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}
