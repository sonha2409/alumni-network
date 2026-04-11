"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/notifications";
import { isEmailEnabled } from "@/lib/queries/notification-preferences";
import { geocodeLocation } from "@/lib/geocoding";
import type { ActionResult, EventRow } from "@/lib/types";
import {
  eventInputSchema,
  rsvpInputSchema,
  uuidSchema,
  hasMajorEdit,
  canCreateEvent,
  MAX_EVENTS_PER_WEEK,
  type EventInput,
} from "./schemas";

// =============================================================================
// Internal helpers
// =============================================================================

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type AuthUser = NonNullable<
  Awaited<ReturnType<SupabaseServerClient["auth"]["getUser"]>>["data"]["user"]
>;

type VerifiedGate =
  | { ok: false; error: string }
  | { ok: true; user: AuthUser; supabase: SupabaseServerClient };

async function requireVerifiedUser(): Promise<VerifiedGate> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be logged in." };

  const { data: row } = await supabase
    .from("users")
    .select("verification_status")
    .eq("id", user.id)
    .single();

  if (!row || row.verification_status !== "verified") {
    return { ok: false, error: "You must be verified to do this." };
  }
  return { ok: true, user, supabase };
}

async function getMyConnectionIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<Set<string>> {
  const { data } = await supabase
    .from("connections")
    .select("requester_id, receiver_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);
  const ids = new Set<string>();
  for (const c of data ?? []) {
    ids.add(c.requester_id === userId ? c.receiver_id : c.requester_id);
  }
  return ids;
}

type DbEventRow = EventInput & {
  id: string;
  creator_id: string;
  latitude: number | null;
  longitude: number | null;
  deleted_at: string | null;
};

function buildEventPayload(input: EventInput) {
  return {
    title: input.title,
    description: input.description ?? null,
    location_type: input.location_type,
    address: input.address ?? null,
    virtual_url: input.virtual_url ?? null,
    start_time: input.start_time,
    end_time: input.end_time,
    event_timezone: input.event_timezone,
    is_public: input.is_public,
    capacity: input.capacity ?? null,
    cover_image_url: input.cover_image_url ?? null,
    group_id: input.group_id ?? null,
  };
}

/**
 * Fire-and-forget geocoding: updates lat/lng on the event row.
 */
async function geocodeEventAddress(eventId: string, address: string) {
  try {
    const coords = await geocodeLocation(null, null, address);
    if (!coords) return;
    const supabase = await createClient();
    await supabase
      .from("events")
      .update({ latitude: coords.latitude, longitude: coords.longitude })
      .eq("id", eventId);
  } catch (err) {
    console.error("[events:geocode]", { eventId, error: (err as Error).message });
  }
}

/**
 * Fire-and-forget notification fan-out for edit cascade / cancellation.
 * A2 pattern: kicks off after the DB commit, not awaited.
 */
async function fanOutEventNotification(
  eventId: string,
  title: string,
  type: "event_update" | "event_cancelled" | "event_invite",
  body: string,
  link: string,
  exclude: string | null = null
) {
  try {
    const supabase = await createClient();

    const [rsvpsRes, invitesRes] = await Promise.all([
      supabase.from("event_rsvps").select("user_id").eq("event_id", eventId),
      supabase.from("event_invites").select("invitee_id").eq("event_id", eventId),
    ]);

    const targets = new Set<string>();
    for (const r of rsvpsRes.data ?? []) targets.add(r.user_id);
    for (const i of invitesRes.data ?? []) targets.add(i.invitee_id);
    if (exclude) targets.delete(exclude);

    await Promise.all(
      Array.from(targets).map((uid) =>
        notifyUser(uid, type, title, body, link)
      )
    );
  } catch (err) {
    console.error("[events:fanOut]", { eventId, error: (err as Error).message });
  }
}

/**
 * Fire-and-forget: notify nearby users about a new public event.
 * Caps: 50 emails per event, 80 emails per day (shared budget).
 */
async function broadcastNearbyEventNotification(
  eventId: string,
  eventTitle: string,
  eventAddress: string | null,
  startTime: string,
  timezone: string
) {
  const EVENT_EMAIL_CAP = 50;
  const DAILY_EMAIL_CAP = 80;
  const DAILY_KEY = "event_nearby";
  const EVENT_KEY = `event_nearby:${eventId}`;

  try {
    const supabase = await createClient();

    // Find recipients within their chosen radius
    const { data: recipients, error } = await supabase.rpc(
      "events_find_nearby_recipients",
      { p_event_id: eventId }
    );

    if (error || !recipients?.length) return;

    // Format date for email
    const dateObj = new Date(startTime);
    const dateStr = dateObj.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
      timeZoneName: "short",
    });

    const locationStr = eventAddress ?? "Online";
    const eventLink = `/events/${eventId}`;

    // Pre-fetch daily counter to avoid per-recipient RPC when already capped
    const { data: dailyCount } = await supabase.rpc("get_email_counter", {
      p_counter_key: DAILY_KEY,
    });
    let currentDailyCount = (dailyCount as number) ?? 0;
    let eventEmailCount = 0;

    // Process recipients sequentially with throttling to respect Resend's
    // rate limit (free tier: 5 req/s). Batch 3 emails, then pause 1s.
    const BATCH_SIZE = 3;
    let batchCount = 0;

    for (const recipient of recipients) {
      const uid = recipient.user_id as string;
      const distKm = recipient.distance_km as number;
      const body = `"${eventTitle}" is happening ${locationStr !== "Online" ? `near you (${Math.round(distKm)} km)` : "online"}`;

      // Determine if we can send email for this recipient
      let sendEmail = false;
      if (eventEmailCount < EVENT_EMAIL_CAP && currentDailyCount < DAILY_EMAIL_CAP) {
        const emailEnabled = await isEmailEnabled(uid, "event_nearby");
        if (emailEnabled) {
          sendEmail = true;
        }
      }

      if (sendEmail) {
        // Increment both counters
        await Promise.all([
          supabase.rpc("increment_email_counter", { p_counter_key: DAILY_KEY }),
          supabase.rpc("increment_email_counter", { p_counter_key: EVENT_KEY }),
        ]);
        currentDailyCount++;
        eventEmailCount++;

        // Throttle: pause after every batch to avoid Resend rate limits
        batchCount++;
        if (batchCount >= BATCH_SIZE) {
          await new Promise((r) => setTimeout(r, 1000));
          batchCount = 0;
        }

        await notifyUser(uid, "event_nearby", "Event near you", body, eventLink, {
          eventTitle,
          eventDate: dateStr,
          eventLocation: locationStr,
          eventDistanceKm: distKm,
        });
      } else {
        // In-app only (no email context)
        await notifyUser(uid, "event_nearby", "Event near you", body, eventLink);
      }
    }
  } catch (err) {
    console.error("[events:broadcastNearby]", {
      eventId,
      error: (err as Error).message,
    });
  }
}

// =============================================================================
// createEvent
// =============================================================================

export async function createEvent(
  input: unknown
): Promise<ActionResult<EventRow>> {
  try {
    const parsed = eventInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const gate = await requireVerifiedUser();
    if (!gate.ok) return { success: false, error: gate.error };
    const { user, supabase } = gate;

    // Rate limit: ≤3 future events created in the last rolling 7 days
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const nowIso = new Date().toISOString();
    const { count } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", user.id)
      .is("deleted_at", null)
      .gte("start_time", nowIso)
      .gte("created_at", weekAgo);

    if (!canCreateEvent(count ?? 0)) {
      return {
        success: false,
        error: `You've reached the limit of ${MAX_EVENTS_PER_WEEK} upcoming events in the last 7 days.`,
      };
    }

    // Validate group membership if linking to a group
    if (parsed.data.group_id) {
      const { data: membership } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", parsed.data.group_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) {
        return {
          success: false,
          error: "You must be a member of the group to link an event to it.",
        };
      }
    }

    const { data: event, error } = await supabase
      .from("events")
      .insert({ ...buildEventPayload(parsed.data), creator_id: user.id })
      .select()
      .single();

    if (error || !event) {
      console.error("[ServerAction:createEvent]", {
        userId: user.id,
        error: error?.message,
      });
      return { success: false, error: error?.message ?? "Failed to create event." };
    }

    // Fire-and-forget: geocode then broadcast nearby notifications
    if (parsed.data.location_type !== "virtual" && parsed.data.address) {
      void geocodeEventAddress(event.id, parsed.data.address).then(() => {
        if (parsed.data.is_public) {
          void broadcastNearbyEventNotification(
            event.id,
            parsed.data.title,
            parsed.data.address ?? null,
            parsed.data.start_time,
            parsed.data.event_timezone
          );
        }
      });
    } else if (parsed.data.is_public) {
      // Virtual events: broadcast immediately (no geocoding needed —
      // RPC will return empty since event has no coordinates, which is correct:
      // virtual-only events don't trigger radius notifications)
    }

    revalidatePath("/events");
    if (parsed.data.group_id) {
      revalidatePath(`/groups`);
    }
    return { success: true, data: event as EventRow };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ServerAction:createEvent]", { error: message });
    return { success: false, error: `Create failed: ${message}` };
  }
}

// =============================================================================
// updateEvent
// =============================================================================

export async function updateEvent(
  eventId: string,
  input: unknown
): Promise<ActionResult<EventRow>> {
  const idCheck = uuidSchema.safeParse(eventId);
  if (!idCheck.success) return { success: false, error: "Invalid event ID." };

  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const gate = await requireVerifiedUser();
  if (!gate.ok) return { success: false, error: gate.error };
  const { user, supabase } = gate;

  // Load existing event — RLS will only return rows the user can see;
  // host check is enforced by RLS on UPDATE.
  const { data: existing, error: fetchErr } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !existing) {
    return { success: false, error: "Event not found." };
  }

  const before = existing as DbEventRow;
  const after = parsed.data;

  const major = hasMajorEdit(
    {
      start_time: before.start_time,
      end_time: before.end_time,
      location_type: before.location_type,
      address: before.address,
      virtual_url: before.virtual_url,
    },
    {
      start_time: after.start_time,
      end_time: after.end_time,
      location_type: after.location_type,
      address: after.address ?? null,
      virtual_url: after.virtual_url ?? null,
    }
  );

  // Capacity-decrease detection
  const newCapacity = after.capacity ?? null;
  const oldCapacity = before.capacity ?? null;
  const capacityDecreased =
    newCapacity !== null && (oldCapacity === null || newCapacity < oldCapacity);

  try {
    const { data: updated, error } = await supabase
      .from("events")
      .update(buildEventPayload(after))
      .eq("id", eventId)
      .select()
      .single();

    if (error || !updated) {
      console.error("[ServerAction:updateEvent]", {
        userId: user.id,
        eventId,
        error: error?.message,
      });
      return { success: false, error: "Failed to update event." };
    }

    // Re-geocode if address changed
    const addressChanged =
      (after.address ?? null) !== (before.address ?? null) &&
      after.location_type !== "virtual" &&
      after.address;
    if (addressChanged) {
      void geocodeEventAddress(eventId, after.address!);
    }

    // Major-edit cascade: mark RSVPs needs_reconfirm + notify
    if (major) {
      await supabase
        .from("event_rsvps")
        .update({ needs_reconfirm: true })
        .eq("event_id", eventId)
        .in("status", ["going", "maybe"]);

      void fanOutEventNotification(
        eventId,
        updated.title,
        "event_update",
        "An event you RSVP'd to has changed. Please re-confirm.",
        `/events/${eventId}`,
        user.id
      );
    }

    // Capacity decrease: push tail of Going into waitlist
    if (capacityDecreased) {
      const { data: going } = await supabase
        .from("event_rsvps")
        .select("id, user_id, plus_one_name, plus_one_email, created_at")
        .eq("event_id", eventId)
        .eq("status", "going")
        .order("created_at", { ascending: true });

      const overflow = (going ?? []).slice(newCapacity!);
      for (const row of overflow) {
        // Move to waitlist preserving created_at
        await supabase.from("event_waitlist").insert({
          event_id: eventId,
          user_id: row.user_id,
          plus_one_name: row.plus_one_name,
          plus_one_email: row.plus_one_email,
          created_at: row.created_at,
        });
        await supabase.from("event_rsvps").delete().eq("id", row.id);
      }
    }

    revalidatePath("/events");
    revalidatePath(`/events/${eventId}`);
    return { success: true, data: updated as EventRow };
  } catch (err) {
    console.error("[ServerAction:updateEvent]", {
      userId: user.id,
      eventId,
      error: (err as Error).message,
    });
    return { success: false, error: "Something went wrong." };
  }
}

// =============================================================================
// cancelEvent
// =============================================================================

export async function cancelEvent(eventId: string): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(eventId);
  if (!idCheck.success) return { success: false, error: "Invalid event ID." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be logged in." };

  const { data: event } = await supabase
    .from("events")
    .select("id, title, creator_id")
    .eq("id", eventId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!event) return { success: false, error: "Event not found." };
  if (event.creator_id !== user.id) {
    return { success: false, error: "Only the creator can cancel this event." };
  }

  const { error } = await supabase
    .from("events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", eventId);

  if (error) {
    console.error("[ServerAction:cancelEvent]", {
      userId: user.id,
      eventId,
      error: error.message,
    });
    return { success: false, error: "Failed to cancel event." };
  }

  void fanOutEventNotification(
    eventId,
    event.title,
    "event_cancelled",
    `"${event.title}" has been cancelled.`,
    `/events`,
    user.id
  );

  revalidatePath("/events");
  return { success: true, data: undefined };
}
