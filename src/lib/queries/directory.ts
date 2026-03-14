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

  // Build the base query — select profiles with joined industry/specialization,
  // career entries, and availability tags inline (P2: eliminates 2 follow-up queries)
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
      has_contact_details,
      last_active_at,
      primary_industry:industries!profiles_primary_industry_id_fkey(id, name),
      primary_specialization:specializations!profiles_primary_specialization_id_fkey(id, name),
      career_entries(job_title, company),
      user_availability_tags(tag_type:availability_tag_types(id, name, slug))
    `,
      { count: "exact" }
    )
    .eq("career_entries.is_current", true);

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

  // Extract career and tags from inline nested selects (no follow-up queries needed)
  // If filtering by availability tags, do it after fetch
  // (Supabase JS client can't easily filter on junction table)
  let filteredProfiles = (profiles ?? []) as Record<string, unknown>[];

  if (
    filters.availabilityTagIds &&
    filters.availabilityTagIds.length > 0
  ) {
    const requiredTagIds = new Set(filters.availabilityTagIds);
    filteredProfiles = filteredProfiles.filter((p) => {
      const tags = (p.user_availability_tags as { tag_type: { id: string } | null }[] | null) ?? [];
      return tags.some((t) => t.tag_type && requiredTagIds.has(t.tag_type.id));
    });
  }

  // Map to DirectoryProfile shape
  const directoryProfiles: DirectoryProfile[] = filteredProfiles.map((p) => {
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
