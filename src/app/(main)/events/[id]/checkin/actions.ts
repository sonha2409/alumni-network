"use server";

import { createClient } from "@/lib/supabase/server";
import { verifyCheckinToken } from "@/lib/checkin-token";
import type { ActionResult } from "@/lib/types";

interface CheckinResult {
  alreadyCheckedIn: boolean;
}

export async function processCheckin(
  eventId: string,
  token: string
): Promise<ActionResult<CheckinResult>> {
  // 1. Verify HMAC token
  const tokenResult = verifyCheckinToken(token, eventId);
  if (!tokenResult.valid) {
    const messages: Record<string, string> = {
      malformed_token: "Invalid QR code. Please scan again.",
      event_mismatch: "This QR code is for a different event.",
      token_expired: "This QR code has expired. Ask the host to show the latest code.",
      invalid_signature: "Invalid QR code. Please scan again.",
    };
    return {
      success: false,
      error: messages[tokenResult.error] ?? "Invalid token",
    };
  }

  // 2. Call SECURITY DEFINER RPC for DB-side checks + insert
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Please log in to check in." };

  const { data, error } = await supabase.rpc("checkin_user", {
    p_event_id: eventId,
  });

  if (error) {
    console.error("[ServerAction:processCheckin]", {
      userId: user.id,
      error: error.message,
    });
    return { success: false, error: "Something went wrong. Please try again." };
  }

  const result = data as { success: boolean; error?: string; already_checked_in?: boolean };

  if (!result.success) {
    const messages: Record<string, string> = {
      not_authenticated: "Please log in to check in.",
      event_not_found: "Event not found.",
      outside_time_window: "Check-in is only available during the event time window.",
      no_going_rsvp: "You need a Going RSVP to check in.",
    };
    return {
      success: false,
      error: messages[result.error ?? ""] ?? "Check-in failed.",
    };
  }

  return {
    success: true,
    data: { alreadyCheckedIn: result.already_checked_in ?? false },
  };
}
