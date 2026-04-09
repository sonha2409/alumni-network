"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

import { createClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/notifications";
import type { ActionResult } from "@/lib/types";
import { rsvpInputSchema, uuidSchema } from "./schemas";

const MAX_COHOSTS = 3;
const MAX_INVITES_PER_CALL = 100;

// =============================================================================
// addCoHost / removeCoHost — creator only, target must be verified connection
// =============================================================================

export async function addCoHost(
  eventId: string,
  userId: string
): Promise<ActionResult> {
  const parsed = z
    .object({ eventId: uuidSchema, userId: uuidSchema })
    .safeParse({ eventId, userId });
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be logged in." };

  const { data: event } = await supabase
    .from("events")
    .select("id, creator_id")
    .eq("id", eventId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!event) return { success: false, error: "Event not found." };
  if (event.creator_id !== user.id) {
    return { success: false, error: "Only the creator can add co-hosts." };
  }
  if (userId === user.id) {
    return { success: false, error: "You are already the creator." };
  }

  // Target must be verified
  const { data: targetUser } = await supabase
    .from("users")
    .select("verification_status")
    .eq("id", userId)
    .single();
  if (!targetUser || targetUser.verification_status !== "verified") {
    return { success: false, error: "Co-host must be a verified user." };
  }

  // Target must be an accepted connection of the creator
  const { data: conn } = await supabase
    .from("connections")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${user.id},receiver_id.eq.${userId}),and(requester_id.eq.${userId},receiver_id.eq.${user.id})`
    )
    .maybeSingle();
  if (!conn) {
    return { success: false, error: "Co-host must be one of your connections." };
  }

  // Count existing co-hosts (cap 3)
  const { count } = await supabase
    .from("event_cohosts")
    .select("user_id", { count: "exact", head: true })
    .eq("event_id", eventId);
  if ((count ?? 0) >= MAX_COHOSTS) {
    return {
      success: false,
      error: `You can have at most ${MAX_COHOSTS} co-hosts.`,
    };
  }

  const { error } = await supabase
    .from("event_cohosts")
    .insert({ event_id: eventId, user_id: userId });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "That user is already a co-host." };
    }
    console.error("[ServerAction:addCoHost]", {
      userId: user.id,
      eventId,
      error: error.message,
    });
    return { success: false, error: "Failed to add co-host." };
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true, data: undefined };
}

export async function removeCoHost(
  eventId: string,
  userId: string
): Promise<ActionResult> {
  const parsed = z
    .object({ eventId: uuidSchema, userId: uuidSchema })
    .safeParse({ eventId, userId });
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be logged in." };

  const { data: event } = await supabase
    .from("events")
    .select("creator_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return { success: false, error: "Event not found." };
  if (event.creator_id !== user.id) {
    return { success: false, error: "Only the creator can remove co-hosts." };
  }

  const { error } = await supabase
    .from("event_cohosts")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (error) {
    console.error("[ServerAction:removeCoHost]", { error: error.message });
    return { success: false, error: "Failed to remove co-host." };
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true, data: undefined };
}

// =============================================================================
// inviteConnections — host invites from their own connections
// =============================================================================

export async function inviteConnections(
  eventId: string,
  userIds: string[]
): Promise<ActionResult<{ invited: number; skipped: number }>> {
  const parsed = z
    .object({
      eventId: uuidSchema,
      userIds: z.array(uuidSchema).min(1).max(MAX_INVITES_PER_CALL),
    })
    .safeParse({ eventId, userIds });
  if (!parsed.success) {
    return { success: false, error: "Invalid input." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be logged in." };

  // Host check (creator or co-host)
  const { data: hostCheck } = await supabase.rpc("is_event_host", {
    p_event_id: eventId,
    p_user_id: user.id,
  });
  if (!hostCheck) {
    return { success: false, error: "Only hosts can invite." };
  }

  // Load event title for notification
  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", eventId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!event) return { success: false, error: "Event not found." };

  // Filter userIds to those that are accepted connections of the inviter
  const { data: conns } = await supabase
    .from("connections")
    .select("requester_id, receiver_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);
  const connected = new Set<string>();
  for (const c of conns ?? []) {
    connected.add(c.requester_id === user.id ? c.receiver_id : c.requester_id);
  }

  const eligible = userIds.filter((id) => connected.has(id));
  if (eligible.length === 0) {
    return {
      success: false,
      error: "You can only invite your connections.",
    };
  }

  // Skip existing invites
  const { data: existing } = await supabase
    .from("event_invites")
    .select("invitee_id")
    .eq("event_id", eventId)
    .in("invitee_id", eligible);
  const already = new Set((existing ?? []).map((r) => r.invitee_id));
  const toInsert = eligible.filter((id) => !already.has(id));

  if (toInsert.length === 0) {
    return {
      success: true,
      data: { invited: 0, skipped: userIds.length },
    };
  }

  const { error } = await supabase.from("event_invites").insert(
    toInsert.map((invitee_id) => ({
      event_id: eventId,
      invitee_id,
      invited_by: user.id,
    }))
  );

  if (error) {
    console.error("[ServerAction:inviteConnections]", { error: error.message });
    return { success: false, error: "Failed to send invites." };
  }

  // Fire-and-forget notifications
  void Promise.all(
    toInsert.map((uid) =>
      notifyUser(
        uid,
        "event_invite",
        `You're invited: ${event.title}`,
        `You've been invited to "${event.title}".`,
        `/events/${eventId}`
      )
    )
  );

  revalidatePath(`/events/${eventId}`);
  return {
    success: true,
    data: { invited: toInsert.length, skipped: userIds.length - toInsert.length },
  };
}

// =============================================================================
// rsvp — verified users only. Handles capacity + waitlist.
// =============================================================================

export async function rsvp(
  input: unknown
): Promise<ActionResult<{ status: "going" | "maybe" | "cant_go" | "waitlisted" }>> {
  const parsed = rsvpInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const { eventId, status, plusOneName, plusOneEmail } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be logged in." };

  // Verified check
  const { data: me } = await supabase
    .from("users")
    .select("verification_status")
    .eq("id", user.id)
    .single();
  if (!me || me.verification_status !== "verified") {
    return { success: false, error: "You must be verified to RSVP." };
  }

  // Load event — RLS will filter out private events the user can't see.
  // End-time check: cannot RSVP to past events.
  const { data: event } = await supabase
    .from("events")
    .select("id, capacity, end_time, is_public")
    .eq("id", eventId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!event) return { success: false, error: "Event not found." };
  if (new Date(event.end_time) < new Date()) {
    return { success: false, error: "This event has already ended." };
  }

  // For "going" with finite capacity, check availability and route to waitlist
  if (status === "going" && event.capacity !== null) {
    const { count: goingCount } = await supabase
      .from("event_rsvps")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "going");

    // If user already has a going RSVP, don't double-count them when checking.
    const { data: myExisting } = await supabase
      .from("event_rsvps")
      .select("id, status")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    const effectiveGoing =
      (goingCount ?? 0) - (myExisting?.status === "going" ? 1 : 0);

    if (effectiveGoing >= event.capacity) {
      // Route to waitlist (upsert waitlist row, remove any existing rsvp row)
      if (myExisting) {
        await supabase.from("event_rsvps").delete().eq("id", myExisting.id);
      }
      const { error: wlErr } = await supabase
        .from("event_waitlist")
        .upsert(
          {
            event_id: eventId,
            user_id: user.id,
            plus_one_name: plusOneName ?? null,
            plus_one_email: plusOneEmail ?? null,
          },
          { onConflict: "event_id,user_id" }
        );
      if (wlErr) {
        console.error("[ServerAction:rsvp:waitlist]", { error: wlErr.message });
        return { success: false, error: "Failed to join waitlist." };
      }
      revalidatePath(`/events/${eventId}`);
      return { success: true, data: { status: "waitlisted" } };
    }
  }

  // Remove any waitlist entry the user might have (switching to going/maybe/cant)
  await supabase
    .from("event_waitlist")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", user.id);

  // Upsert the RSVP
  const { error } = await supabase.from("event_rsvps").upsert(
    {
      event_id: eventId,
      user_id: user.id,
      status,
      plus_one_name: plusOneName ?? null,
      plus_one_email: plusOneEmail ?? null,
      needs_reconfirm: false,
    },
    { onConflict: "event_id,user_id" }
  );

  if (error) {
    console.error("[ServerAction:rsvp]", {
      userId: user.id,
      eventId,
      error: error.message,
    });
    return { success: false, error: `RSVP failed: ${error.message}` };
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true, data: { status } };
}

// =============================================================================
// cancelRsvp — removes user's rsvp/waitlist row, triggers promotion.
// =============================================================================

export async function cancelRsvp(eventId: string): Promise<ActionResult> {
  const parsed = uuidSchema.safeParse(eventId);
  if (!parsed.success) return { success: false, error: "Invalid event ID." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be logged in." };

  // Capture previous status to decide on promotion
  const { data: existing } = await supabase
    .from("event_rsvps")
    .select("status")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  // Remove from both tables (safe if no row exists)
  await supabase
    .from("event_rsvps")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", user.id);
  await supabase
    .from("event_waitlist")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", user.id);

  // If the user was Going, a seat freed — promote waitlist
  if (existing?.status === "going") {
    const { data: promoted } = await supabase.rpc("promote_event_waitlist", {
      p_event_id: eventId,
    });
    if (promoted && typeof promoted === "string") {
      void notifyUser(
        promoted,
        "event_rsvp_promoted",
        "You're off the waitlist!",
        "A spot opened up — you're now on the Going list.",
        `/events/${eventId}`
      );
    }
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true, data: undefined };
}
