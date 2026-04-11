import { createClient } from "@/lib/supabase/server";
import type {
  GroupFilters,
  GroupsResult,
  GroupWithMemberCount,
  GroupWithDetails,
  DirectoryProfile,
} from "@/lib/types";

const DEFAULT_PAGE_SIZE = 12;

/**
 * Fetch paginated groups with member counts and current user's membership status.
 * Filters by search (name), type, and pagination.
 */
export async function getGroups(
  filters: GroupFilters,
  userId: string
): Promise<GroupsResult> {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  // Build the query for active groups
  let query = supabase
    .from("groups")
    .select("*", { count: "exact" })
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (filters.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }

  if (filters.type) {
    query = query.eq("type", filters.type);
  }

  query = query.range(offset, offset + pageSize - 1);

  const { data: groups, error, count } = await query;

  if (error) {
    console.error("[Query:getGroups]", { userId, error: error.message });
    return { groups: [], totalCount: 0, page, pageSize, totalPages: 0 };
  }

  const totalCount = count ?? 0;

  if (!groups || groups.length === 0) {
    return { groups: [], totalCount, page, pageSize, totalPages: Math.ceil(totalCount / pageSize) };
  }

  // Fetch member counts for all groups in one query
  const groupIds = groups.map((g) => g.id);

  const { data: memberCounts } = await supabase
    .from("group_members")
    .select("group_id")
    .in("group_id", groupIds);

  // Count members per group
  const countMap = new Map<string, number>();
  for (const row of memberCounts ?? []) {
    countMap.set(row.group_id, (countMap.get(row.group_id) ?? 0) + 1);
  }

  // Check which groups the current user is a member of
  const { data: userMemberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId)
    .in("group_id", groupIds);

  const memberSet = new Set((userMemberships ?? []).map((m) => m.group_id));

  const enrichedGroups: GroupWithMemberCount[] = groups.map((g) => ({
    ...g,
    member_count: countMap.get(g.id) ?? 0,
    is_member: memberSet.has(g.id),
  }));

  return {
    groups: enrichedGroups,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

/**
 * Fetch a single group by slug with details (creator profile, member count, membership status).
 */
export async function getGroupBySlug(
  slug: string,
  userId: string
): Promise<GroupWithDetails | null> {
  const supabase = await createClient();

  const { data: group, error } = await supabase
    .from("groups")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[Query:getGroupBySlug]", { slug, error: error.message });
    return null;
  }

  if (!group) return null;

  // Fetch member count
  const { count: memberCount } = await supabase
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", group.id);

  // Check if current user is a member
  const { data: membership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", group.id)
    .eq("user_id", userId)
    .maybeSingle();

  // Fetch creator profile
  const { data: creatorProfile } = await supabase
    .from("profiles")
    .select("full_name, photo_url")
    .eq("user_id", group.created_by)
    .maybeSingle();

  return {
    ...group,
    member_count: memberCount ?? 0,
    is_member: !!membership,
    created_by_name: creatorProfile?.full_name ?? "Unknown",
    created_by_photo_url: creatorProfile?.photo_url ?? null,
  };
}

/**
 * Fetch paginated members of a group with their profile info.
 * Returns DirectoryProfile[] for reuse with existing profile card components.
 */
export async function getGroupMembers(
  groupId: string,
  filters: { search?: string; page?: number; pageSize?: number }
): Promise<{ members: DirectoryProfile[]; totalCount: number; page: number; pageSize: number; totalPages: number }> {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  // First get member user IDs with pagination
  let membersQuery = supabase
    .from("group_members")
    .select("user_id", { count: "exact" })
    .eq("group_id", groupId)
    .order("created_at", { ascending: true })
    .range(offset, offset + pageSize - 1);

  const { data: memberRows, error: membersError, count } = await membersQuery;

  if (membersError) {
    console.error("[Query:getGroupMembers]", { groupId, error: membersError.message });
    return { members: [], totalCount: 0, page, pageSize, totalPages: 0 };
  }

  const totalCount = count ?? 0;

  if (!memberRows || memberRows.length === 0) {
    return { members: [], totalCount, page, pageSize, totalPages: Math.ceil(totalCount / pageSize) };
  }

  const userIds = memberRows.map((m) => m.user_id);

  // Fetch profiles for these users
  let profilesQuery = supabase
    .from("profiles")
    .select(`
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
      has_contact_details,
      primary_industry_id,
      primary_specialization_id
    `)
    .in("user_id", userIds);

  if (filters.search) {
    profilesQuery = profilesQuery.ilike("full_name", `%${filters.search}%`);
  }

  const { data: profiles, error: profilesError } = await profilesQuery;

  if (profilesError) {
    console.error("[Query:getGroupMembers]", { groupId, error: profilesError.message });
    return { members: [], totalCount: 0, page, pageSize, totalPages: 0 };
  }

  // Fetch industry/specialization names for display
  const industryIds = (profiles ?? [])
    .map((p) => p.primary_industry_id)
    .filter(Boolean) as string[];
  const specIds = (profiles ?? [])
    .map((p) => p.primary_specialization_id)
    .filter(Boolean) as string[];

  const [{ data: industries }, { data: specializations }] = await Promise.all([
    industryIds.length > 0
      ? supabase.from("industries").select("id, name").in("id", industryIds)
      : Promise.resolve({ data: [] }),
    specIds.length > 0
      ? supabase.from("specializations").select("id, name").in("id", specIds)
      : Promise.resolve({ data: [] }),
  ]);

  const industryMap = new Map((industries ?? []).map((i) => [i.id, i]));
  const specMap = new Map((specializations ?? []).map((s) => [s.id, s]));

  // Fetch current job title for each profile
  const profileIds = (profiles ?? []).map((p) => p.id);
  const { data: currentJobs } = profileIds.length > 0
    ? await supabase
        .from("career_entries")
        .select("profile_id, job_title, company, company_website")
        .in("profile_id", profileIds)
        .eq("is_current", true)
    : { data: [] };

  const jobMap = new Map(
    (currentJobs ?? []).map((j) => [j.profile_id, { title: j.job_title, company: j.company, company_website: j.company_website }])
  );

  const members: DirectoryProfile[] = (profiles ?? []).map((p) => ({
    id: p.id,
    user_id: p.user_id,
    full_name: p.full_name,
    photo_url: p.photo_url,
    graduation_year: p.graduation_year,
    country: p.country,
    state_province: p.state_province,
    city: p.city,
    bio: p.bio,
    last_active_at: p.last_active_at,
    has_contact_details: p.has_contact_details,
    primary_industry: p.primary_industry_id
      ? industryMap.get(p.primary_industry_id) ?? null
      : null,
    primary_specialization: p.primary_specialization_id
      ? specMap.get(p.primary_specialization_id) ?? null
      : null,
    current_job_title: jobMap.get(p.id)?.title ?? null,
    current_company: jobMap.get(p.id)?.company ?? null,
    current_company_website: jobMap.get(p.id)?.company_website ?? null,
    availability_tags: [],
  }));

  return {
    members,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}
