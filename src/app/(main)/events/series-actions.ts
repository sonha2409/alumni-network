"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/notifications";
import type { ActionResult, EventRow, EventSeriesRow } from "@/lib/types";
import {
  seriesInputSchema,
  uuidSchema,
  MAX_SERIES_OCCURRENCES,
  type SeriesEditScope,
  type SeriesCancelScope,
} from "./schemas";

// =============================================================================
// Internal helpers
// =============================================================================

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function requireVerifiedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { ok: false as const, error: "You must be logged in." };

  const { data: row } = await supabase
    .from("users")
    .select("verification_status")
    .eq("id", user.id)
    .single();

  if (!row || row.verification_status !== "verified") {
    return { ok: false as const, error: "You must be verified to do this." };
  }
  return { ok: true as const, user, supabase };
}

/**
 * Generate occurrence dates for a series.
 * Returns an array of {start, end} Date pairs, preserving the time-of-day
 * from the base event and advancing by the rrule interval.
 */
function materializeOccurrenceDates(
  baseStart: Date,
  baseEnd: Date,
  rrule: "weekly" | "monthly",
  intervalVal: number,
  untilDate: Date
): Array<{ start: Date; end: Date }> {
  const durationMs = baseEnd.getTime() - baseStart.getTime();
  const occurrences: Array<{ start: Date; end: Date }> = [];

  let current = new Date(baseStart);

  while (current <= untilDate && occurrences.length < MAX_SERIES_OCCURRENCES) {
    const start = new Date(current);
    const end = new Date(start.getTime() + durationMs);
    occurrences.push({ start, end });

    if (rrule === "weekly") {
      current.setDate(current.getDate() + 7 * intervalVal);
    } else {
      // Monthly: advance by N months, clamp to last day if needed
      const nextMonth = current.getMonth() + intervalVal;
      const nextDate = new Date(current);
      nextDate.setMonth(nextMonth);
      // If the day overflowed (e.g. Jan 31 + 1mo = Mar 3), clamp to last day
      if (nextDate.getDate() !== current.getDate()) {
        nextDate.setDate(0); // last day of previous month
      }
      current = nextDate;
    }
  }

  return occurrences;
}

// =============================================================================
// createEventSeries
// =============================================================================

export async function createEventSeries(
  input: unknown
): Promise<ActionResult<{ series: EventSeriesRow; events: EventRow[] }>> {
  try {
    const parsed = seriesInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const gate = await requireVerifiedUser();
    if (!gate.ok) return { success: false, error: gate.error };
    const { user, supabase } = gate;

    const data = parsed.data;

    // Validate group membership if linking to a group
    if (data.group_id) {
      const { data: membership } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", data.group_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) {
        return {
          success: false,
          error: "You must be a member of the group to link an event to it.",
        };
      }
    }

    // Generate occurrence dates
    const occurrences = materializeOccurrenceDates(
      new Date(data.start_time),
      new Date(data.end_time),
      data.rrule,
      data.interval_val,
      new Date(data.until_date + "T23:59:59Z")
    );

    if (occurrences.length < 2) {
      return {
        success: false,
        error:
          "A recurring event must have at least 2 occurrences. Extend the end date or reduce the interval.",
      };
    }

    // Rate limit: count total future events including what we're about to create
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const nowIso = new Date().toISOString();
    const { count: recentCount } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", user.id)
      .is("deleted_at", null)
      .gte("start_time", nowIso)
      .gte("created_at", weekAgo);

    // For series, we allow up to MAX_SERIES_OCCURRENCES but check
    // the user hasn't already hit rate limits for standalone events.
    // Series bypass the per-event rate limit but cap at 52 occurrences.
    if ((recentCount ?? 0) + occurrences.length > MAX_SERIES_OCCURRENCES) {
      return {
        success: false,
        error: `Too many upcoming events. You have ${recentCount ?? 0} existing and are trying to create ${occurrences.length}. Maximum is ${MAX_SERIES_OCCURRENCES}.`,
      };
    }

    // 1. Create the series row
    const { data: series, error: seriesErr } = await supabase
      .from("event_series")
      .insert({
        creator_id: user.id,
        rrule: data.rrule,
        interval_val: data.interval_val,
        until_date: data.until_date,
        base_title: data.title,
      })
      .select()
      .single();

    if (seriesErr || !series) {
      console.error("[ServerAction:createEventSeries]", {
        userId: user.id,
        error: seriesErr?.message,
      });
      return { success: false, error: "Failed to create event series." };
    }

    // 2. Materialize all occurrence event rows
    const eventRows = occurrences.map((occ, idx) => ({
      creator_id: user.id,
      title: data.title,
      description: data.description ?? null,
      location_type: data.location_type,
      address: data.address ?? null,
      virtual_url: data.virtual_url ?? null,
      start_time: occ.start.toISOString(),
      end_time: occ.end.toISOString(),
      event_timezone: data.event_timezone,
      is_public: data.is_public,
      capacity: data.capacity ?? null,
      cover_image_url: data.cover_image_url ?? null,
      group_id: data.group_id ?? null,
      series_id: series.id,
      series_index: idx,
    }));

    const { data: events, error: eventsErr } = await supabase
      .from("events")
      .insert(eventRows)
      .select();

    if (eventsErr || !events) {
      console.error("[ServerAction:createEventSeries]", {
        userId: user.id,
        seriesId: series.id,
        error: eventsErr?.message,
      });
      // Clean up series row
      await supabase.from("event_series").delete().eq("id", series.id);
      return { success: false, error: "Failed to create event occurrences." };
    }

    revalidatePath("/events");
    return {
      success: true,
      data: {
        series: series as EventSeriesRow,
        events: events as EventRow[],
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ServerAction:createEventSeries]", { error: message });
    return { success: false, error: `Create series failed: ${message}` };
  }
}

// =============================================================================
// updateSeriesOccurrence
// =============================================================================

export async function updateSeriesOccurrence(
  eventId: string,
  scope: SeriesEditScope,
  input: unknown
): Promise<ActionResult<EventRow>> {
  const idCheck = uuidSchema.safeParse(eventId);
  if (!idCheck.success) return { success: false, error: "Invalid event ID." };

  // For "this" scope, we reuse the base eventInputSchema
  // For "this_and_following" and "all", we also use eventInputSchema
  // (series metadata like rrule/until_date don't change on edit)
  const { eventInputSchema } = await import("./schemas");
  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const gate = await requireVerifiedUser();
  if (!gate.ok) return { success: false, error: gate.error };
  const { user, supabase } = gate;

  // Load the event being edited
  const { data: existing } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) return { success: false, error: "Event not found." };
  if (existing.creator_id !== user.id) {
    // Check cohost
    const { data: isHost } = await supabase.rpc("is_event_host", {
      p_event_id: eventId,
      p_user_id: user.id,
    });
    if (!isHost) return { success: false, error: "Not authorized." };
  }

  if (!existing.series_id) {
    return { success: false, error: "This event is not part of a series." };
  }

  const data = parsed.data;
  const nowIso = new Date().toISOString();

  try {
    if (scope === "this") {
      // Just update this single occurrence
      const { data: updated, error } = await supabase
        .from("events")
        .update({
          title: data.title,
          description: data.description ?? null,
          location_type: data.location_type,
          address: data.address ?? null,
          virtual_url: data.virtual_url ?? null,
          start_time: data.start_time,
          end_time: data.end_time,
          event_timezone: data.event_timezone,
          is_public: data.is_public,
          capacity: data.capacity ?? null,
          cover_image_url: data.cover_image_url ?? null,
          group_id: data.group_id ?? null,
        })
        .eq("id", eventId)
        .select()
        .single();

      if (error || !updated) {
        return { success: false, error: "Failed to update occurrence." };
      }

      revalidatePath("/events");
      revalidatePath(`/events/${eventId}`);
      return { success: true, data: updated as EventRow };
    }

    if (scope === "all") {
      // Update all future occurrences in the series (not past ones)
      const payload = {
        title: data.title,
        description: data.description ?? null,
        location_type: data.location_type,
        address: data.address ?? null,
        virtual_url: data.virtual_url ?? null,
        event_timezone: data.event_timezone,
        is_public: data.is_public,
        capacity: data.capacity ?? null,
        cover_image_url: data.cover_image_url ?? null,
        group_id: data.group_id ?? null,
      };

      // Update future occurrences (preserve individual start/end times)
      const { error } = await supabase
        .from("events")
        .update(payload)
        .eq("series_id", existing.series_id)
        .is("deleted_at", null)
        .gte("start_time", nowIso);

      if (error) {
        console.error("[ServerAction:updateSeriesOccurrence:all]", {
          error: error.message,
        });
        return { success: false, error: "Failed to update series." };
      }

      // Update base_title on the series row
      await supabase
        .from("event_series")
        .update({ base_title: data.title })
        .eq("id", existing.series_id);

      // Re-fetch the edited event for return
      const { data: refreshed } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      revalidatePath("/events");
      return { success: true, data: (refreshed ?? existing) as EventRow };
    }

    if (scope === "this_and_following") {
      // Split the series:
      // 1. Close the original series at the occurrence before this one
      // 2. Create a new series starting from this occurrence
      // 3. Move this + all following occurrences to the new series with updated fields

      const seriesId = existing.series_id;
      const currentIndex = existing.series_index as number;

      // Load the original series
      const { data: originalSeries } = await supabase
        .from("event_series")
        .select("*")
        .eq("id", seriesId)
        .single();

      if (!originalSeries) {
        return { success: false, error: "Series not found." };
      }

      // Update until_date of original series to just before this occurrence
      const prevOccDate = new Date(existing.start_time);
      prevOccDate.setDate(prevOccDate.getDate() - 1);
      await supabase
        .from("event_series")
        .update({ until_date: prevOccDate.toISOString().split("T")[0] })
        .eq("id", seriesId);

      // Create new series for this and following
      const { data: newSeries, error: newSeriesErr } = await supabase
        .from("event_series")
        .insert({
          creator_id: user.id,
          rrule: originalSeries.rrule,
          interval_val: originalSeries.interval_val,
          until_date: originalSeries.until_date,
          base_title: data.title,
        })
        .select()
        .single();

      if (newSeriesErr || !newSeries) {
        return { success: false, error: "Failed to split series." };
      }

      // Get all future occurrences from this index onward
      const { data: followingEvents } = await supabase
        .from("events")
        .select("id, series_index")
        .eq("series_id", seriesId)
        .is("deleted_at", null)
        .gte("series_index", currentIndex)
        .order("series_index", { ascending: true });

      // Move them to the new series and apply updates
      const payload = {
        title: data.title,
        description: data.description ?? null,
        location_type: data.location_type,
        address: data.address ?? null,
        virtual_url: data.virtual_url ?? null,
        event_timezone: data.event_timezone,
        is_public: data.is_public,
        capacity: data.capacity ?? null,
        cover_image_url: data.cover_image_url ?? null,
        group_id: data.group_id ?? null,
        series_id: newSeries.id,
      };

      for (let i = 0; i < (followingEvents ?? []).length; i++) {
        const ev = followingEvents![i];
        await supabase
          .from("events")
          .update({ ...payload, series_index: i })
          .eq("id", ev.id);
      }

      // Re-fetch the edited event
      const { data: refreshed } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      revalidatePath("/events");
      return { success: true, data: (refreshed ?? existing) as EventRow };
    }

    return { success: false, error: "Invalid scope." };
  } catch (err) {
    console.error("[ServerAction:updateSeriesOccurrence]", {
      eventId,
      scope,
      error: (err as Error).message,
    });
    return { success: false, error: "Something went wrong." };
  }
}

// =============================================================================
// cancelSeriesOccurrence
// =============================================================================

export async function cancelSeriesOccurrence(
  eventId: string,
  scope: SeriesCancelScope
): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(eventId);
  if (!idCheck.success) return { success: false, error: "Invalid event ID." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be logged in." };

  const { data: event } = await supabase
    .from("events")
    .select("id, title, creator_id, series_id, series_index")
    .eq("id", eventId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!event) return { success: false, error: "Event not found." };
  if (event.creator_id !== user.id) {
    return { success: false, error: "Only the creator can cancel this event." };
  }

  if (!event.series_id) {
    return { success: false, error: "This event is not part of a series." };
  }

  const nowIso = new Date().toISOString();

  try {
    if (scope === "this") {
      // Cancel just this one occurrence
      const { error } = await supabase
        .from("events")
        .update({ deleted_at: nowIso })
        .eq("id", eventId);

      if (error) {
        return { success: false, error: "Failed to cancel occurrence." };
      }

      // Notify attendees of this occurrence
      void fanOutCancellation(eventId, event.title, user.id);

      revalidatePath("/events");
      return { success: true, data: undefined };
    }

    if (scope === "all_future") {
      // Cancel this occurrence + all later ones in the series
      // Use the selected event's start_time as cutoff (not now()),
      // so earlier future occurrences are preserved.
      const { data: selectedEvent } = await supabase
        .from("events")
        .select("start_time")
        .eq("id", eventId)
        .single();

      const cutoff = selectedEvent?.start_time ?? nowIso;

      const { error: eventsErr } = await supabase
        .from("events")
        .update({ deleted_at: nowIso })
        .eq("series_id", event.series_id)
        .is("deleted_at", null)
        .gte("start_time", cutoff);

      if (eventsErr) {
        return { success: false, error: "Failed to cancel series." };
      }

      // Soft-delete the series itself
      await supabase
        .from("event_series")
        .update({ deleted_at: nowIso })
        .eq("id", event.series_id);

      // Notify attendees of all cancelled occurrences
      void fanOutSeriesCancellation(
        event.series_id,
        event.title,
        user.id,
        cutoff
      );

      revalidatePath("/events");
      return { success: true, data: undefined };
    }

    return { success: false, error: "Invalid scope." };
  } catch (err) {
    console.error("[ServerAction:cancelSeriesOccurrence]", {
      eventId,
      scope,
      error: (err as Error).message,
    });
    return { success: false, error: "Something went wrong." };
  }
}

// =============================================================================
// Notification helpers (fire-and-forget)
// =============================================================================

async function fanOutCancellation(
  eventId: string,
  title: string,
  excludeUserId: string
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
    targets.delete(excludeUserId);

    await Promise.all(
      Array.from(targets).map((uid) =>
        notifyUser(
          uid,
          "event_cancelled",
          "Event cancelled",
          `"${title}" has been cancelled.`,
          "/events"
        )
      )
    );
  } catch (err) {
    console.error("[events:fanOutCancellation]", {
      eventId,
      error: (err as Error).message,
    });
  }
}

async function fanOutSeriesCancellation(
  seriesId: string,
  title: string,
  excludeUserId: string,
  afterIso: string
) {
  try {
    const supabase = await createClient();

    // Get all events in the series that were just cancelled
    const { data: cancelledEvents } = await supabase
      .from("events")
      .select("id")
      .eq("series_id", seriesId)
      .not("deleted_at", "is", null)
      .gte("start_time", afterIso);

    if (!cancelledEvents?.length) return;

    // Gather all unique affected users across all cancelled occurrences
    const targets = new Set<string>();
    for (const ev of cancelledEvents) {
      const [rsvpsRes, invitesRes] = await Promise.all([
        supabase.from("event_rsvps").select("user_id").eq("event_id", ev.id),
        supabase
          .from("event_invites")
          .select("invitee_id")
          .eq("event_id", ev.id),
      ]);
      for (const r of rsvpsRes.data ?? []) targets.add(r.user_id);
      for (const i of invitesRes.data ?? []) targets.add(i.invitee_id);
    }
    targets.delete(excludeUserId);

    // Send one notification per user (not per occurrence)
    await Promise.all(
      Array.from(targets).map((uid) =>
        notifyUser(
          uid,
          "event_cancelled",
          "Event series cancelled",
          `All upcoming occurrences of "${title}" have been cancelled.`,
          "/events"
        )
      )
    );
  } catch (err) {
    console.error("[events:fanOutSeriesCancellation]", {
      seriesId,
      error: (err as Error).message,
    });
  }
}
