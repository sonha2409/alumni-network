import { createClient } from "@/lib/supabase/server";
import type { VerificationRequest, VerificationRequestWithUser } from "@/lib/types";

/**
 * Fetch the latest verification request for a user.
 */
export async function getLatestVerificationRequest(
  userId: string
): Promise<VerificationRequest | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("verification_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[Query:getLatestVerificationRequest]", {
      userId,
      error: error.message,
    });
    return null;
  }

  return data as VerificationRequest | null;
}

/**
 * Fetch all pending verification requests with user profile info (admin use).
 * Uses a Postgres view-style approach: fetch requests, then enrich with user/profile data.
 */
export async function getPendingVerificationRequests(): Promise<
  VerificationRequestWithUser[]
> {
  const supabase = await createClient();

  // Fetch pending requests
  const { data: requests, error } = await supabase
    .from("verification_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[Query:getPendingVerificationRequests]", {
      error: error.message,
    });
    return [];
  }

  if (!requests || requests.length === 0) return [];

  // Fetch user emails and profile data for all request user_ids
  const userIds = requests.map((r) => r.user_id);

  const [usersResult, profilesResult] = await Promise.all([
    supabase.from("users").select("id, email").in("id", userIds),
    supabase.from("profiles").select("user_id, full_name, photo_url").in("user_id", userIds),
  ]);

  const usersMap = new Map(
    (usersResult.data ?? []).map((u) => [u.id, u])
  );
  const profilesMap = new Map(
    (profilesResult.data ?? []).map((p) => [p.user_id, p])
  );

  return requests.map((request) => {
    const user = usersMap.get(request.user_id);
    const profile = profilesMap.get(request.user_id);
    return {
      ...request,
      user_full_name: profile?.full_name ?? "Unknown",
      user_photo_url: profile?.photo_url ?? null,
      user_email: user?.email ?? "Unknown",
    } as VerificationRequestWithUser;
  });
}

/**
 * Fetch a single verification request by ID with user info (admin use).
 */
export async function getVerificationRequestById(
  requestId: string
): Promise<VerificationRequestWithUser | null> {
  const supabase = await createClient();

  const { data: request, error } = await supabase
    .from("verification_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[Query:getVerificationRequestById]", {
      requestId,
      error: error.message,
    });
    return null;
  }

  const [userResult, profileResult] = await Promise.all([
    supabase.from("users").select("email").eq("id", request.user_id).single(),
    supabase.from("profiles").select("full_name, photo_url").eq("user_id", request.user_id).single(),
  ]);

  return {
    ...request,
    user_full_name: profileResult.data?.full_name ?? "Unknown",
    user_photo_url: profileResult.data?.photo_url ?? null,
    user_email: userResult.data?.email ?? "Unknown",
  } as VerificationRequestWithUser;
}

/**
 * Fetch the user's verification_status from public.users.
 */
export async function getUserVerificationStatus(
  userId: string
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("verification_status")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("[Query:getUserVerificationStatus]", {
      userId,
      error: error.message,
    });
    return null;
  }

  return data?.verification_status ?? null;
}
