"use server";

import { createClient } from "@/lib/supabase/server";
import { signCheckinToken } from "@/lib/checkin-token";
import type { ActionResult } from "@/lib/types";

// ---------------------------------------------------------------------------
// generateCheckinToken — host-only
// ---------------------------------------------------------------------------

interface CheckinToken {
  token: string;
  expiresAt: number;
  checkinUrl: string;
}

export async function generateCheckinToken(
  eventId: string
): Promise<ActionResult<CheckinToken>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Verify host access
  const { data: isHost } = await supabase.rpc("is_event_host", {
    p_event_id: eventId,
    p_user_id: user.id,
  });
  if (!isHost) return { success: false, error: "Not authorized" };

  const { token, expiresAt } = signCheckinToken(eventId);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const checkinUrl = `${siteUrl}/events/${eventId}/checkin?token=${encodeURIComponent(token)}`;

  return {
    success: true,
    data: { token, expiresAt, checkinUrl },
  };
}

// ---------------------------------------------------------------------------
// getCheckins — host-only, returns attendee list
// ---------------------------------------------------------------------------

export interface CheckinAttendee {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  checkedInAt: string;
}

interface CheckinsResult {
  checkins: CheckinAttendee[];
  total: number;
}

export async function getCheckins(
  eventId: string
): Promise<ActionResult<CheckinsResult>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: isHost } = await supabase.rpc("is_event_host", {
    p_event_id: eventId,
    p_user_id: user.id,
  });
  if (!isHost) return { success: false, error: "Not authorized" };

  // RLS allows host to see all checkins
  const { data: checkinRows, error } = await supabase
    .from("event_checkins")
    .select("user_id, checked_in_at")
    .eq("event_id", eventId)
    .order("checked_in_at", { ascending: true });

  if (error) {
    console.error("[ServerAction:getCheckins]", { userId: user.id, error: error.message });
    return { success: false, error: "Failed to load check-ins" };
  }

  const rows = checkinRows ?? [];
  if (rows.length === 0) {
    return { success: true, data: { checkins: [], total: 0 } };
  }

  // Fetch profiles for checked-in users
  const userIds = rows.map((r) => r.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, avatar_url")
    .in("user_id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.user_id, p])
  );

  const checkins: CheckinAttendee[] = rows.map((r) => {
    const profile = profileMap.get(r.user_id);
    return {
      userId: r.user_id,
      fullName: profile?.full_name ?? "Unknown",
      avatarUrl: profile?.avatar_url ?? null,
      checkedInAt: r.checked_in_at,
    };
  });

  return { success: true, data: { checkins, total: checkins.length } };
}
