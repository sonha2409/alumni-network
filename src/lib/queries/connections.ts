import { createClient } from "@/lib/supabase/server";
import type {
  Connection,
  ConnectionWithProfile,
  RelationshipInfo,
  Block,
} from "@/lib/types";

/**
 * Get the relationship status between the current user and another user.
 * Checks connections (both directions) and blocks (both directions).
 */
export async function getRelationshipInfo(
  currentUserId: string,
  otherUserId: string
): Promise<RelationshipInfo> {
  const supabase = await createClient();

  // Check blocks first (current user's blocks — RLS only allows seeing own blocks)
  const { data: myBlock } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", currentUserId)
    .eq("blocked_id", otherUserId)
    .maybeSingle();

  if (myBlock) {
    return { status: "blocked_by_me", connectionId: null, blockId: myBlock.id };
  }

  // Check if the other user blocked us — we can't SELECT their blocks via RLS,
  // so we check if we can find a connection. If blocked_by_them, we won't be
  // able to insert a connection (checked in server action instead).
  // For now, we infer "blocked_by_them" isn't detectable from the client — we
  // just show "none" and let the server action reject the request.

  // Check connections (both directions — RLS allows both requester & receiver)
  const { data: connection } = await supabase
    .from("connections")
    .select("id, requester_id, receiver_id, status")
    .or(
      `and(requester_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`
    )
    .maybeSingle();

  if (!connection) {
    return { status: "none", connectionId: null, blockId: null };
  }

  if (connection.status === "accepted") {
    return { status: "connected", connectionId: connection.id, blockId: null };
  }

  if (connection.status === "pending") {
    if (connection.requester_id === currentUserId) {
      return {
        status: "pending_sent",
        connectionId: connection.id,
        blockId: null,
      };
    }
    return {
      status: "pending_received",
      connectionId: connection.id,
      blockId: null,
    };
  }

  // Rejected — treat as "none" so they can re-request
  return { status: "none", connectionId: null, blockId: null };
}

/**
 * Get all accepted connections for a user, with the other person's profile.
 */
export async function getConnections(
  userId: string
): Promise<ConnectionWithProfile[]> {
  const supabase = await createClient();

  const { data: connections, error } = await supabase
    .from("connections")
    .select("*")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[Query:getConnections]", { userId, error: error.message });
    return [];
  }

  if (!connections || connections.length === 0) return [];

  // Collect all "other" user IDs
  const otherUserIds = connections.map((c) =>
    c.requester_id === userId ? c.receiver_id : c.requester_id
  );

  return attachProfiles(connections as Connection[], otherUserIds, userId);
}

/**
 * Get pending connection requests received by a user.
 */
export async function getPendingReceived(
  userId: string
): Promise<ConnectionWithProfile[]> {
  const supabase = await createClient();

  const { data: connections, error } = await supabase
    .from("connections")
    .select("*")
    .eq("receiver_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Query:getPendingReceived]", {
      userId,
      error: error.message,
    });
    return [];
  }

  if (!connections || connections.length === 0) return [];

  const requesterIds = connections.map((c) => c.requester_id);

  return attachProfiles(connections as Connection[], requesterIds, userId);
}

/**
 * Get pending connection requests sent by a user.
 */
export async function getPendingSent(
  userId: string
): Promise<ConnectionWithProfile[]> {
  const supabase = await createClient();

  const { data: connections, error } = await supabase
    .from("connections")
    .select("*")
    .eq("requester_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Query:getPendingSent]", { userId, error: error.message });
    return [];
  }

  if (!connections || connections.length === 0) return [];

  const receiverIds = connections.map((c) => c.receiver_id);

  return attachProfiles(connections as Connection[], receiverIds, userId);
}

/**
 * Get count of pending received connection requests.
 */
export async function getPendingReceivedCount(
  userId: string
): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("connections")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .eq("status", "pending");

  if (error) {
    console.error("[Query:getPendingReceivedCount]", {
      userId,
      error: error.message,
    });
    return 0;
  }

  return count ?? 0;
}

/**
 * Get all users blocked by the current user.
 */
export async function getBlockedUsers(
  userId: string
): Promise<(Block & { profile: { id: string; full_name: string; photo_url: string | null } | null })[]> {
  const supabase = await createClient();

  const { data: blocks, error } = await supabase
    .from("blocks")
    .select("*")
    .eq("blocker_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Query:getBlockedUsers]", { userId, error: error.message });
    return [];
  }

  if (!blocks || blocks.length === 0) return [];

  const blockedIds = blocks.map((b) => b.blocked_id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, user_id, full_name, photo_url")
    .in("user_id", blockedIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.user_id, p])
  );

  return blocks.map((block) => ({
    ...block,
    profile: profileMap.get(block.blocked_id) ?? null,
  }));
}

/**
 * Get a map of connection statuses for a list of user IDs relative to the current user.
 * Used by the directory grid to show status badges on cards.
 */
export async function getConnectionStatusMap(
  currentUserId: string,
  otherUserIds: string[]
): Promise<Map<string, "connected" | "pending_sent" | "pending_received">> {
  if (otherUserIds.length === 0) return new Map();

  const supabase = await createClient();

  const { data: connections, error } = await supabase
    .from("connections")
    .select("requester_id, receiver_id, status")
    .in("status", ["pending", "accepted"])
    .or(`requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

  if (error || !connections) return new Map();

  const statusMap = new Map<
    string,
    "connected" | "pending_sent" | "pending_received"
  >();

  for (const conn of connections) {
    const otherId =
      conn.requester_id === currentUserId
        ? conn.receiver_id
        : conn.requester_id;

    if (!otherUserIds.includes(otherId)) continue;

    if (conn.status === "accepted") {
      statusMap.set(otherId, "connected");
    } else if (conn.status === "pending") {
      statusMap.set(
        otherId,
        conn.requester_id === currentUserId
          ? "pending_sent"
          : "pending_received"
      );
    }
  }

  return statusMap;
}

// =============================================================================
// Internal helper: attach profile data to connections
// =============================================================================

async function attachProfiles(
  connections: Connection[],
  otherUserIds: string[],
  currentUserId: string
): Promise<ConnectionWithProfile[]> {
  const supabase = await createClient();

  // Fetch profiles for the other users
  const { data: profiles } = await supabase
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
      primary_specialization:specializations!profiles_primary_specialization_id_fkey(id, name)
    `
    )
    .in("user_id", otherUserIds);

  // Fetch current job for each profile
  const profileIds = (profiles ?? []).map((p) => p.id);
  const { data: currentJobs } = await supabase
    .from("career_entries")
    .select("profile_id, job_title, company")
    .in("profile_id", profileIds)
    .eq("is_current", true);

  // Fetch availability tags
  const { data: tags } = await supabase
    .from("user_availability_tags")
    .select("profile_id, tag_type:availability_tag_types(id, name, slug)")
    .in("profile_id", profileIds);

  const profileMap = new Map<string, ConnectionWithProfile["profile"]>();
  for (const p of profiles ?? []) {
    const job = currentJobs?.find((j) => j.profile_id === p.id);
    const profileTags = (tags ?? [])
      .filter((t) => t.profile_id === p.id)
      .map((t) => t.tag_type as unknown as { id: string; name: string; slug: string });

    profileMap.set(p.user_id, {
      id: p.id,
      user_id: p.user_id,
      full_name: p.full_name,
      photo_url: p.photo_url,
      graduation_year: p.graduation_year,
      country: p.country,
      state_province: p.state_province,
      city: p.city,
      bio: p.bio,
      has_contact_details: p.has_contact_details ?? false,
      last_active_at: p.last_active_at,
      primary_industry: p.primary_industry as unknown as { id: string; name: string } | null,
      primary_specialization: p.primary_specialization as unknown as {
        id: string;
        name: string;
      } | null,
      current_job_title: job?.job_title ?? null,
      current_company: job?.company ?? null,
      availability_tags: profileTags,
    });
  }

  return connections
    .map((conn) => {
      const otherId =
        conn.requester_id === currentUserId
          ? conn.receiver_id
          : conn.requester_id;
      const profile = profileMap.get(otherId);
      if (!profile) return null;
      return { ...conn, profile };
    })
    .filter(Boolean) as ConnectionWithProfile[];
}
