"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Rate limit configuration per user tier.
 *
 * Future scaling notes:
 * - Phase 2: Move to Redis-based rate limiting for sub-ms checks at scale.
 * - Phase 3: Per-conversation rate limits to prevent spam in specific threads.
 * - Phase 3: Sliding window algorithm instead of fixed 24h window.
 */
const RATE_LIMITS = {
  /** Verified < 7 days */
  new_user: {
    messages_per_day: 20,
    conversations_per_day: 5,
  },
  /** Verified >= 7 days */
  established: {
    messages_per_day: 500,
    conversations_per_day: 20,
  },
  /** Admins — unlimited */
  admin: {
    messages_per_day: Infinity,
    conversations_per_day: Infinity,
  },
} as const;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetsAt: string;
}

/**
 * Determine user tier based on role and verification approval date.
 * Uses verification_requests.reviewed_at to determine how long ago they were verified.
 */
async function getUserTier(
  userId: string
): Promise<"new_user" | "established" | "admin"> {
  const supabase = await createClient();

  const { data: user } = await supabase
    .from("users")
    .select("role, verification_status")
    .eq("id", userId)
    .single();

  if (!user) return "new_user";
  if (user.role === "admin") return "admin";
  if (user.verification_status !== "verified") return "new_user";

  // Check when verification was approved
  const { data: request } = await supabase
    .from("verification_requests")
    .select("reviewed_at")
    .eq("user_id", userId)
    .eq("status", "approved")
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (request?.reviewed_at) {
    const verifiedDate = new Date(request.reviewed_at);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (verifiedDate <= sevenDaysAgo) return "established";
  }

  return "new_user";
}

/**
 * Get the start of the current 24h rate limit window.
 * Uses midnight UTC for consistent, predictable resets.
 */
function getRateLimitWindow(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/**
 * Check if a user can send a message.
 */
export async function checkMessageRateLimit(
  userId: string
): Promise<RateLimitResult> {
  const tier = await getUserTier(userId);
  const limits = RATE_LIMITS[tier];

  if (limits.messages_per_day === Infinity) {
    return {
      allowed: true,
      remaining: Infinity,
      limit: Infinity,
      resetsAt: new Date().toISOString(),
    };
  }

  const { start, end } = getRateLimitWindow();
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", userId)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());

  if (error) {
    console.error("[RateLimit:checkMessage]", { userId, error: error.message });
    // Fail open — allow the message but log the error
    return {
      allowed: true,
      remaining: 0,
      limit: limits.messages_per_day,
      resetsAt: end.toISOString(),
    };
  }

  const used = count ?? 0;
  const remaining = Math.max(0, limits.messages_per_day - used);

  return {
    allowed: remaining > 0,
    remaining,
    limit: limits.messages_per_day,
    resetsAt: end.toISOString(),
  };
}

/**
 * Check if a user can create a new conversation.
 */
export async function checkConversationRateLimit(
  userId: string
): Promise<RateLimitResult> {
  const tier = await getUserTier(userId);
  const limits = RATE_LIMITS[tier];

  if (limits.conversations_per_day === Infinity) {
    return {
      allowed: true,
      remaining: Infinity,
      limit: Infinity,
      resetsAt: new Date().toISOString(),
    };
  }

  const { start, end } = getRateLimitWindow();
  const supabase = await createClient();

  // Count conversations where this user is a participant, created today
  const { count, error } = await supabase
    .from("conversation_participants")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());

  if (error) {
    console.error("[RateLimit:checkConversation]", {
      userId,
      error: error.message,
    });
    return {
      allowed: true,
      remaining: 0,
      limit: limits.conversations_per_day,
      resetsAt: end.toISOString(),
    };
  }

  const used = count ?? 0;
  // Divide by 2 because each conversation creates 2 participant rows
  const conversationsCreated = Math.floor(used / 2);
  const remaining = Math.max(
    0,
    limits.conversations_per_day - conversationsCreated
  );

  return {
    allowed: remaining > 0,
    remaining,
    limit: limits.conversations_per_day,
    resetsAt: end.toISOString(),
  };
}
