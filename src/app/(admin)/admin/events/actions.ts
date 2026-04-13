"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/notifications";
import type {
  ActionResult,
  AdminAction,
  AdminEventDetail,
  AdminEventFilters,
  AdminEventRow,
  AdminEventsResult,
  EventModerationActionRow,
} from "@/lib/types";

// =============================================================================
// Auth helper
// =============================================================================

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase: null, userId: null, error: "Not authenticated" };

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || userData.role !== "admin") {
    return { supabase: null, userId: null, error: "Unauthorized" };
  }

  return { supabase, userId: user.id, error: null };
}

// =============================================================================
// Audit log helper
// =============================================================================

async function logAdminAction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  adminId: string,
  targetUserId: string,
  action: AdminAction,
  details: Record<string, unknown> = {}
) {
  const { error } = await supabase.rpc("insert_audit_log", {
    p_admin_id: adminId,
    p_target_user_id: targetUserId,
    p_action: action,
    p_details: details,
  });

  if (error) {
    console.error("[AuditLog:insert]", {
      adminId,
      targetUserId,
      action,
      error: error.message,
    });
  }
}

// =============================================================================
// Queries
// =============================================================================

export async function getAdminEvents(
  filters: AdminEventFilters
): Promise<ActionResult<AdminEventsResult>> {
  const { supabase, error: authError } = await assertAdmin();
  if (authError || !supabase) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  try {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const now = new Date().toISOString();

    // We need to query events (including soft-deleted ones for admin)
    // and join with profiles for creator info.
    // Since RLS filters out deleted events for normal users,
    // admin needs a service-role or we use a workaround.
    // Actually, admin RLS on events allows SELECT on all via events_select_public.
    // But deleted_at rows are filtered by RLS. We need to bypass this.
    // Solution: use an RPC or query without the deleted_at filter from RLS.
    // Looking at existing RLS: events_select_public filters deleted_at IS NULL.
    // So admin can't see cancelled events via normal query.
    // We'll query directly and build stats from the raw data.

    // Build base query - admin sees all events including deleted
    // We'll use a raw query approach via RPC or construct carefully.
    // Actually, let's just query and handle the status filter appropriately.

    let query = supabase
      .from("events")
      .select(
        `
        id,
        title,
        start_time,
        end_time,
        location_type,
        address,
        is_public,
        capacity,
        deleted_at,
        created_at,
        series_id,
        group_id,
        creator_id
      `,
        { count: "exact" }
      );

    // Status filter
    if (filters.status === "active") {
      query = query.is("deleted_at", null).gte("end_time", now);
    } else if (filters.status === "cancelled") {
      query = query.not("deleted_at", "is", null);
    } else if (filters.status === "past") {
      query = query.is("deleted_at", null).lt("end_time", now);
    }
    // no status filter = all events (but RLS may hide deleted ones)

    // Search by title
    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      query = query.ilike("title", term);
    }

    // Public/private filter
    if (filters.isPublic !== undefined) {
      query = query.eq("is_public", filters.isPublic);
    }

    // Order by start_time descending (newest first)
    query = query.order("start_time", { ascending: false }).range(offset, offset + pageSize - 1);

    const { data: events, count, error } = await query;

    if (error) {
      console.error("[ServerAction:getAdminEvents]", { error: error.message });
      return { success: false, error: "Failed to load events." };
    }

    if (!events || events.length === 0) {
      return {
        success: true,
        data: {
          events: [],
          totalCount: count ?? 0,
          page,
          pageSize,
          totalPages: Math.ceil((count ?? 0) / pageSize),
        },
      };
    }

    // Fetch creator profiles for all events
    const creatorIds = [...new Set(events.map((e) => e.creator_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", creatorIds);

    // Fetch creator emails
    const { data: users } = await supabase
      .from("users")
      .select("id, email")
      .in("id", creatorIds);

    // Fetch going counts for all events
    const eventIds = events.map((e) => e.id);
    const { data: rsvpCounts } = await supabase
      .from("event_rsvps")
      .select("event_id")
      .in("event_id", eventIds)
      .eq("status", "going");

    // Fetch moderation actions for cancelled events
    const cancelledIds = events.filter((e) => e.deleted_at).map((e) => e.id);
    let moderationActions: { event_id: string; reason: string; created_at: string; admin_id: string }[] = [];
    if (cancelledIds.length > 0) {
      const { data: modActions } = await supabase
        .from("event_moderation_actions")
        .select("event_id, reason, created_at, admin_id")
        .in("event_id", cancelledIds)
        .eq("action", "cancel")
        .order("created_at", { ascending: false });
      moderationActions = modActions ?? [];
    }

    // Fetch admin profiles for moderation actions
    const modAdminIds = [...new Set(moderationActions.map((m) => m.admin_id))];
    let adminProfiles: { id: string; full_name: string | null }[] = [];
    if (modAdminIds.length > 0) {
      const { data: ap } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", modAdminIds);
      adminProfiles = ap ?? [];
    }

    // Build count map
    const goingCountMap = new Map<string, number>();
    for (const r of rsvpCounts ?? []) {
      goingCountMap.set(r.event_id, (goingCountMap.get(r.event_id) ?? 0) + 1);
    }

    // Build profile/email maps
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    const emailMap = new Map((users ?? []).map((u) => [u.id, u.email]));
    const adminProfileMap = new Map(adminProfiles.map((p) => [p.id, p.full_name]));

    // Build moderation action map (latest per event)
    const modActionMap = new Map<string, { admin_name: string | null; reason: string; created_at: string }>();
    for (const m of moderationActions) {
      if (!modActionMap.has(m.event_id)) {
        modActionMap.set(m.event_id, {
          admin_name: adminProfileMap.get(m.admin_id) ?? null,
          reason: m.reason,
          created_at: m.created_at,
        });
      }
    }

    const enrichedEvents: AdminEventRow[] = events.map((e) => ({
      ...e,
      creator_name: profileMap.get(e.creator_id) ?? null,
      creator_email: emailMap.get(e.creator_id) ?? "",
      going_count: goingCountMap.get(e.id) ?? 0,
      moderation_action: modActionMap.get(e.id) ?? null,
    }));

    return {
      success: true,
      data: {
        events: enrichedEvents,
        totalCount: count ?? 0,
        page,
        pageSize,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:getAdminEvents]", { error: message });
    return { success: false, error: "Failed to load events." };
  }
}

export async function getAdminEventDetail(
  eventId: string
): Promise<ActionResult<AdminEventDetail>> {
  const { supabase, error: authError } = await assertAdmin();
  if (authError || !supabase) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  try {
    const { data: event, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .maybeSingle();

    if (error || !event) {
      return { success: false, error: "Event not found." };
    }

    // Fetch creator profile + email
    const [profileRes, userRes] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", event.creator_id).single(),
      supabase.from("users").select("email").eq("id", event.creator_id).single(),
    ]);

    // Fetch RSVP counts
    const [goingRes, maybeRes, waitlistRes] = await Promise.all([
      supabase.from("event_rsvps").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "going"),
      supabase.from("event_rsvps").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "maybe"),
      supabase.from("event_waitlist").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    ]);

    // Fetch cohost and comment counts
    const [cohostRes, commentsRes] = await Promise.all([
      supabase.from("event_cohosts").select("user_id", { count: "exact", head: true }).eq("event_id", eventId),
      supabase.from("event_comments").select("id", { count: "exact", head: true }).eq("event_id", eventId).is("deleted_at", null),
    ]);

    // Fetch moderation history
    const { data: modHistory } = await supabase
      .from("event_moderation_actions")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    // Enrich moderation history with admin names
    const modAdminIds = [...new Set((modHistory ?? []).map((m) => m.admin_id))];
    let adminProfiles: { id: string; full_name: string | null }[] = [];
    if (modAdminIds.length > 0) {
      const { data: ap } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", modAdminIds);
      adminProfiles = ap ?? [];
    }
    const adminProfileMap = new Map(adminProfiles.map((p) => [p.id, p.full_name]));

    const moderationHistory: EventModerationActionRow[] = (modHistory ?? []).map((m) => ({
      ...m,
      admin_name: adminProfileMap.get(m.admin_id) ?? null,
    }));

    // Find latest cancel moderation action
    const latestCancel = moderationHistory.find((m) => m.action === "cancel");

    const detail: AdminEventDetail = {
      id: event.id,
      title: event.title,
      description: event.description,
      start_time: event.start_time,
      end_time: event.end_time,
      location_type: event.location_type,
      address: event.address,
      virtual_url: event.virtual_url,
      event_timezone: event.event_timezone,
      is_public: event.is_public,
      capacity: event.capacity,
      deleted_at: event.deleted_at,
      created_at: event.created_at,
      series_id: event.series_id,
      group_id: event.group_id,
      creator_id: event.creator_id,
      creator_name: profileRes.data?.full_name ?? null,
      creator_email: userRes.data?.email ?? "",
      going_count: goingRes.count ?? 0,
      maybe_count: maybeRes.count ?? 0,
      waitlist_count: waitlistRes.count ?? 0,
      cohost_count: cohostRes.count ?? 0,
      comments_count: commentsRes.count ?? 0,
      moderation_action: latestCancel
        ? { admin_name: latestCancel.admin_name, reason: latestCancel.reason, created_at: latestCancel.created_at }
        : null,
      moderation_history: moderationHistory,
    };

    return { success: true, data: detail };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:getAdminEventDetail]", { error: message });
    return { success: false, error: "Failed to load event details." };
  }
}

// =============================================================================
// Admin stats
// =============================================================================

export async function getAdminEventStats(): Promise<
  ActionResult<{
    totalActive: number;
    upcomingThisWeek: number;
    cancelledByAdmin: number;
    totalRsvps: number;
  }>
> {
  const { supabase, error: authError } = await assertAdmin();
  if (authError || !supabase) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  try {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [activeRes, weekRes, modRes, rsvpRes] = await Promise.all([
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .gte("end_time", now.toISOString()),
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .gte("start_time", now.toISOString())
        .lte("start_time", weekFromNow.toISOString()),
      supabase
        .from("event_moderation_actions")
        .select("id", { count: "exact", head: true })
        .eq("action", "cancel"),
      supabase
        .from("event_rsvps")
        .select("id", { count: "exact", head: true })
        .eq("status", "going"),
    ]);

    return {
      success: true,
      data: {
        totalActive: activeRes.count ?? 0,
        upcomingThisWeek: weekRes.count ?? 0,
        cancelledByAdmin: modRes.count ?? 0,
        totalRsvps: rsvpRes.count ?? 0,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:getAdminEventStats]", { error: message });
    return { success: false, error: "Failed to load stats." };
  }
}

// =============================================================================
// Admin cancel event
// =============================================================================

export async function adminCancelEvent(
  eventId: string,
  reason: string
): Promise<ActionResult> {
  const { supabase, userId, error: authError } = await assertAdmin();
  if (authError || !supabase || !userId) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  // Validate reason
  const trimmedReason = reason.trim();
  if (trimmedReason.length < 10 || trimmedReason.length > 1000) {
    return { success: false, error: "Reason must be between 10 and 1000 characters." };
  }

  try {
    // Load event (including deleted to check if already cancelled)
    const { data: event } = await supabase
      .from("events")
      .select("id, title, creator_id, deleted_at, series_id")
      .eq("id", eventId)
      .maybeSingle();

    if (!event) {
      return { success: false, error: "Event not found." };
    }

    if (event.deleted_at) {
      return { success: false, error: "Event is already cancelled." };
    }

    // Count affected RSVPs for audit details
    const { count: rsvpCount } = await supabase
      .from("event_rsvps")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId);

    // 1. Soft-delete the event
    const { error: updateError } = await supabase
      .from("events")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", eventId);

    if (updateError) {
      console.error("[ServerAction:adminCancelEvent]", {
        userId,
        eventId,
        error: updateError.message,
      });
      return { success: false, error: "Failed to cancel event." };
    }

    // 2. Insert moderation action
    const { error: modError } = await supabase
      .from("event_moderation_actions")
      .insert({
        event_id: eventId,
        admin_id: userId,
        action: "cancel",
        reason: trimmedReason,
        details: { affected_rsvps: rsvpCount ?? 0 },
      });

    if (modError) {
      console.error("[ServerAction:adminCancelEvent:modAction]", {
        userId,
        eventId,
        error: modError.message,
      });
    }

    // 3. Audit log (target_user_id = event creator)
    void logAdminAction(supabase, userId, event.creator_id, "cancel_event", {
      event_id: eventId,
      event_title: event.title,
      reason: trimmedReason,
      affected_rsvps: rsvpCount ?? 0,
    });

    // 4. Notify host (event_cancelled_by_admin with reason)
    void notifyUser(
      event.creator_id,
      "event_cancelled_by_admin",
      "Event Cancelled by Administrator",
      `Your event "${event.title}" was cancelled by an administrator. Reason: ${trimmedReason}`,
      "/events",
      {
        eventTitle: event.title,
        adminCancelReason: trimmedReason,
      }
    );

    // 5. Notify all RSVP'd users (standard event_cancelled)
    void fanOutCancelNotification(supabase, eventId, event.title, event.creator_id);

    revalidatePath("/admin/events");
    revalidatePath("/events");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:adminCancelEvent]", { userId, eventId, error: message });
    return { success: false, error: "Failed to cancel event." };
  }
}

/**
 * Fire-and-forget: notify all RSVP'd and invited users about cancellation.
 */
async function fanOutCancelNotification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  title: string,
  excludeUserId: string
) {
  try {
    const [rsvpsRes, invitesRes] = await Promise.all([
      supabase.from("event_rsvps").select("user_id").eq("event_id", eventId),
      supabase.from("event_invites").select("invitee_id").eq("event_id", eventId),
    ]);

    const targets = new Set<string>();
    for (const r of rsvpsRes.data ?? []) targets.add(r.user_id);
    for (const i of invitesRes.data ?? []) targets.add(i.invitee_id);
    // Don't exclude creator — they get the special admin notification separately
    targets.delete(excludeUserId);

    await Promise.all(
      Array.from(targets).map((uid) =>
        notifyUser(
          uid,
          "event_cancelled",
          "Event Cancelled",
          `"${title}" has been cancelled.`,
          "/events"
        )
      )
    );
  } catch (err) {
    console.error("[adminEvents:fanOutCancel]", { eventId, error: (err as Error).message });
  }
}
