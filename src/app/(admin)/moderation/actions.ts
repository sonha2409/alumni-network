"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/notifications";
import type {
  ActionResult,
  AdminAction,
  ModerationReportRow,
  ModerationContextMessage,
  UserWarning,
} from "@/lib/types";

// =============================================================================
// Auth helper — requires moderator or admin role
// =============================================================================

async function assertModerator() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase: null, userId: null, role: null, error: "Not authenticated" };

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["moderator", "admin"].includes(userData.role)) {
    return { supabase: null, userId: null, role: null, error: "Unauthorized" };
  }

  return { supabase, userId: user.id, role: userData.role as "moderator" | "admin", error: null };
}

// =============================================================================
// Audit log helper (reuses existing insert_audit_log RPC)
// =============================================================================

async function logModAction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  modId: string,
  targetUserId: string,
  action: AdminAction,
  details: Record<string, unknown> = {}
) {
  const { error } = await supabase.rpc("insert_audit_log", {
    p_admin_id: modId,
    p_target_user_id: targetUserId,
    p_action: action,
    p_details: details,
  });

  if (error) {
    console.error("[ModerationAuditLog:insert]", {
      modId,
      targetUserId,
      action,
      error: error.message,
    });
  }
}

// =============================================================================
// Get report queue (paginated, filterable)
// =============================================================================

const reportFiltersSchema = z.object({
  status: z
    .enum(["pending", "reviewed", "action_taken", "dismissed", "escalated", "all"])
    .optional()
    .default("pending"),
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(1).max(50).optional().default(20),
});

export async function getReportQueue(
  filters: z.input<typeof reportFiltersSchema> = {}
): Promise<
  ActionResult<{
    reports: ModerationReportRow[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>
> {
  const { supabase, error } = await assertModerator();
  if (error || !supabase) return { success: false, error: error ?? "Unauthorized" };

  const parsed = reportFiltersSchema.safeParse(filters);
  if (!parsed.success) return { success: false, error: "Invalid filters" };

  const { status, page, pageSize } = parsed.data;
  const offset = (page - 1) * pageSize;

  // Build query for reports with joined data
  let countQuery = supabase
    .from("message_reports")
    .select("id", { count: "exact", head: true });

  if (status !== "all") {
    countQuery = countQuery.eq("status", status);
  }

  const { count: totalCount } = await countQuery;
  const total = totalCount ?? 0;

  let dataQuery = supabase
    .from("message_reports")
    .select(`
      id,
      reason,
      status,
      created_at,
      reviewed_at,
      reviewer_notes,
      message_id,
      reporter_id,
      messages!inner (
        id,
        content,
        is_deleted,
        created_at,
        conversation_id,
        sender_id
      )
    `)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (status !== "all") {
    dataQuery = dataQuery.eq("status", status);
  }

  const { data: reports, error: queryError } = await dataQuery;

  if (queryError) {
    console.error("[getReportQueue]", queryError.message);
    return { success: false, error: "Failed to fetch reports" };
  }

  // Enrich with user data for each report
  const enrichedReports: ModerationReportRow[] = [];

  for (const report of reports ?? []) {
    const msg = report.messages as unknown as {
      id: string;
      content: string;
      is_deleted: boolean;
      created_at: string;
      conversation_id: string;
      sender_id: string;
    };

    // Get reported user info
    const { data: reportedUser } = await supabase
      .from("users")
      .select("id, email, muted_until")
      .eq("id", msg.sender_id)
      .single();

    const { data: reportedProfile } = await supabase
      .from("profiles")
      .select("full_name, photo_url")
      .eq("user_id", msg.sender_id)
      .maybeSingle();

    // Count total reports against this user
    const { count: reportCount } = await supabase
      .from("message_reports")
      .select("id", { count: "exact", head: true })
      .eq("messages.sender_id", msg.sender_id);

    // Count warnings for this user
    const { count: warningCount } = await supabase
      .from("user_warnings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", msg.sender_id);

    enrichedReports.push({
      id: report.id,
      reason: report.reason,
      status: report.status as ModerationReportRow["status"],
      created_at: report.created_at,
      reviewed_at: report.reviewed_at,
      reviewer_notes: report.reviewer_notes,
      message_id: msg.id,
      message_content: msg.content,
      message_is_deleted: msg.is_deleted,
      message_created_at: msg.created_at,
      conversation_id: msg.conversation_id,
      reported_user_id: msg.sender_id,
      reported_user_name: reportedProfile?.full_name ?? null,
      reported_user_photo: reportedProfile?.photo_url ?? null,
      reported_user_email: reportedUser?.email ?? "Unknown",
      reported_user_muted_until: reportedUser?.muted_until ?? null,
      reporter_id: report.reporter_id,
      report_count: reportCount ?? 0,
      warning_count: warningCount ?? 0,
    });
  }

  return {
    success: true,
    data: {
      reports: enrichedReports,
      totalCount: total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

// =============================================================================
// Get conversation context for a report
// =============================================================================

export async function getReportContext(
  reportId: string
): Promise<ActionResult<{ messages: ModerationContextMessage[]; warnings: UserWarning[] }>> {
  const { supabase, error } = await assertModerator();
  if (error || !supabase) return { success: false, error: error ?? "Unauthorized" };

  // Get the report with message info
  const { data: report } = await supabase
    .from("message_reports")
    .select(`
      id,
      message_id,
      messages!inner (
        conversation_id,
        sender_id
      )
    `)
    .eq("id", reportId)
    .single();

  if (!report) return { success: false, error: "Report not found" };

  const msg = report.messages as unknown as {
    conversation_id: string;
    sender_id: string;
  };

  // Get conversation messages (last 50 for context)
  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, content, is_deleted, created_at")
    .eq("conversation_id", msg.conversation_id)
    .order("created_at", { ascending: true })
    .limit(50);

  // Get all report message IDs in this conversation to flag them
  const { data: reportedMessageIds } = await supabase
    .from("message_reports")
    .select("message_id");

  const reportedIds = new Set(
    (reportedMessageIds ?? []).map((r: { message_id: string }) => r.message_id)
  );

  // Get sender profiles for display names
  const senderIds = [...new Set((messages ?? []).map((m) => m.sender_id))];
  const senderProfiles: Record<string, string> = {};

  for (const senderId of senderIds) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", senderId)
      .maybeSingle();
    senderProfiles[senderId] = profile?.full_name ?? "Unknown User";
  }

  const contextMessages: ModerationContextMessage[] = (messages ?? []).map((m) => ({
    id: m.id,
    sender_id: m.sender_id,
    sender_name: senderProfiles[m.sender_id] ?? "Unknown User",
    content: m.content,
    is_deleted: m.is_deleted,
    created_at: m.created_at,
    is_reported: reportedIds.has(m.id),
  }));

  // Get warnings for the reported user
  const { data: warnings } = await supabase
    .from("user_warnings")
    .select("id, user_id, moderator_id, report_id, reason, created_at")
    .eq("user_id", msg.sender_id)
    .order("created_at", { ascending: false });

  // Get moderator names for warnings
  const warningsList: UserWarning[] = [];
  for (const w of warnings ?? []) {
    const { data: modProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", w.moderator_id)
      .maybeSingle();

    warningsList.push({
      ...w,
      moderator_name: modProfile?.full_name ?? null,
    });
  }

  return { success: true, data: { messages: contextMessages, warnings: warningsList } };
}

// =============================================================================
// Dismiss report
// =============================================================================

const dismissSchema = z.object({
  reportId: z.string().uuid(),
  notes: z.string().max(1000).optional().default(""),
});

export async function dismissReport(
  reportId: string,
  notes?: string
): Promise<ActionResult> {
  const { supabase, userId, error } = await assertModerator();
  if (error || !supabase || !userId) return { success: false, error: error ?? "Unauthorized" };

  const parsed = dismissSchema.safeParse({ reportId, notes });
  if (!parsed.success) return { success: false, error: "Invalid input" };

  // Get report to find reported user
  const { data: report } = await supabase
    .from("message_reports")
    .select("id, status, messages!inner(sender_id)")
    .eq("id", reportId)
    .single();

  if (!report) return { success: false, error: "Report not found" };
  if (report.status !== "pending" && report.status !== "escalated") {
    return { success: false, error: "Report has already been resolved" };
  }

  const { error: updateError } = await supabase
    .from("message_reports")
    .update({
      status: "dismissed",
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: parsed.data.notes || null,
    })
    .eq("id", reportId);

  if (updateError) {
    console.error("[dismissReport]", updateError.message);
    return { success: false, error: "Failed to dismiss report" };
  }

  const reportedUserId = (report.messages as unknown as { sender_id: string }).sender_id;
  await logModAction(supabase, userId, reportedUserId, "dismiss_report", {
    report_id: reportId,
    notes: parsed.data.notes,
  });

  revalidatePath("/moderation/reports");
  return { success: true, data: undefined };
}

// =============================================================================
// Warn user
// =============================================================================

const warnSchema = z.object({
  reportId: z.string().uuid(),
  reason: z.string().min(1, "Reason is required").max(1000),
});

export async function warnUser(
  reportId: string,
  reason: string
): Promise<ActionResult> {
  const { supabase, userId, error } = await assertModerator();
  if (error || !supabase || !userId) return { success: false, error: error ?? "Unauthorized" };

  const parsed = warnSchema.safeParse({ reportId, reason });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  // Get report
  const { data: report } = await supabase
    .from("message_reports")
    .select("id, status, messages!inner(sender_id)")
    .eq("id", reportId)
    .single();

  if (!report) return { success: false, error: "Report not found" };
  if (report.status !== "pending" && report.status !== "escalated") {
    return { success: false, error: "Report has already been resolved" };
  }

  const reportedUserId = (report.messages as unknown as { sender_id: string }).sender_id;

  // Insert warning record
  const { error: warningError } = await supabase.rpc("insert_user_warning", {
    p_user_id: reportedUserId,
    p_moderator_id: userId,
    p_report_id: reportId,
    p_reason: parsed.data.reason,
  });

  if (warningError) {
    console.error("[warnUser]", warningError.message);
    return { success: false, error: "Failed to create warning" };
  }

  // Update report status
  await supabase
    .from("message_reports")
    .update({
      status: "action_taken",
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: `Warning issued: ${parsed.data.reason}`,
    })
    .eq("id", reportId);

  // Send notification + email to warned user
  await notifyUser(
    reportedUserId,
    "user_warning",
    "You've received a warning",
    `A moderator has warned you: ${parsed.data.reason}`,
    "/notifications",
    { moderationReason: parsed.data.reason }
  );

  await logModAction(supabase, userId, reportedUserId, "warn", {
    report_id: reportId,
    reason: parsed.data.reason,
  });

  revalidatePath("/moderation/reports");
  return { success: true, data: undefined };
}

// =============================================================================
// Mute user
// =============================================================================

const muteSchema = z.object({
  reportId: z.string().uuid(),
  userId: z.string().uuid(),
  duration: z.enum(["1d", "7d", "30d"]),
  reason: z.string().min(1, "Reason is required").max(1000),
});

const MUTE_DURATIONS: Record<string, { ms: number; label: string }> = {
  "1d": { ms: 1 * 24 * 60 * 60 * 1000, label: "1 day" },
  "7d": { ms: 7 * 24 * 60 * 60 * 1000, label: "7 days" },
  "30d": { ms: 30 * 24 * 60 * 60 * 1000, label: "30 days" },
};

export async function muteUser(
  reportId: string,
  targetUserId: string,
  duration: "1d" | "7d" | "30d",
  reason: string
): Promise<ActionResult> {
  const { supabase, userId, error } = await assertModerator();
  if (error || !supabase || !userId) return { success: false, error: error ?? "Unauthorized" };

  const parsed = muteSchema.safeParse({
    reportId,
    userId: targetUserId,
    duration,
    reason,
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  // Prevent muting admins/moderators
  const { data: targetUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", targetUserId)
    .single();

  if (targetUser && ["admin", "moderator"].includes(targetUser.role)) {
    return { success: false, error: "Cannot mute a moderator or admin" };
  }

  const muteDuration = MUTE_DURATIONS[duration];
  const mutedUntil = new Date(Date.now() + muteDuration.ms).toISOString();

  // Mute the user via SECURITY DEFINER function
  // (moderators can't update other users' rows via RLS)
  const { error: muteError } = await supabase.rpc("mute_user", {
    p_user_id: targetUserId,
    p_muted_until: mutedUntil,
    p_muted_reason: parsed.data.reason,
  });

  if (muteError) {
    console.error("[muteUser]", muteError.message);
    return { success: false, error: "Failed to mute user" };
  }

  // Update report status
  await supabase
    .from("message_reports")
    .update({
      status: "action_taken",
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: `User muted for ${muteDuration.label}: ${parsed.data.reason}`,
    })
    .eq("id", reportId);

  // Send notification + email
  await notifyUser(
    targetUserId,
    "user_muted",
    "Your messaging has been restricted",
    `A moderator has restricted your messaging for ${muteDuration.label}: ${parsed.data.reason}`,
    "/notifications",
    { moderationReason: parsed.data.reason, muteDuration: muteDuration.label }
  );

  await logModAction(supabase, userId, targetUserId, "mute", {
    report_id: reportId,
    reason: parsed.data.reason,
    duration,
    muted_until: mutedUntil,
  });

  revalidatePath("/moderation/reports");
  return { success: true, data: undefined };
}

// =============================================================================
// Escalate report (to admin)
// =============================================================================

const escalateSchema = z.object({
  reportId: z.string().uuid(),
  notes: z.string().min(1, "Notes are required for escalation").max(1000),
});

export async function escalateReport(
  reportId: string,
  notes: string
): Promise<ActionResult> {
  const { supabase, userId, error } = await assertModerator();
  if (error || !supabase || !userId) return { success: false, error: error ?? "Unauthorized" };

  const parsed = escalateSchema.safeParse({ reportId, notes });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { data: report } = await supabase
    .from("message_reports")
    .select("id, status, messages!inner(sender_id)")
    .eq("id", reportId)
    .single();

  if (!report) return { success: false, error: "Report not found" };
  if (report.status !== "pending") {
    return { success: false, error: "Only pending reports can be escalated" };
  }

  const { error: updateError } = await supabase
    .from("message_reports")
    .update({
      status: "escalated",
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: `Escalated: ${parsed.data.notes}`,
    })
    .eq("id", reportId);

  if (updateError) {
    console.error("[escalateReport]", updateError.message);
    return { success: false, error: "Failed to escalate report" };
  }

  const reportedUserId = (report.messages as unknown as { sender_id: string }).sender_id;
  await logModAction(supabase, userId, reportedUserId, "escalate_report", {
    report_id: reportId,
    notes: parsed.data.notes,
  });

  revalidatePath("/moderation/reports");
  return { success: true, data: undefined };
}

// =============================================================================
// Unmute user (early release)
// =============================================================================

export async function unmuteUser(targetUserId: string): Promise<ActionResult> {
  const { supabase, userId, error } = await assertModerator();
  if (error || !supabase || !userId) return { success: false, error: error ?? "Unauthorized" };

  if (!targetUserId || typeof targetUserId !== "string") {
    return { success: false, error: "Invalid user ID" };
  }

  // Verify user is actually muted
  const { data: targetUser } = await supabase
    .from("users")
    .select("muted_until")
    .eq("id", targetUserId)
    .single();

  if (!targetUser?.muted_until || new Date(targetUser.muted_until) <= new Date()) {
    return { success: false, error: "User is not currently muted" };
  }

  const { error: unmuteError } = await supabase.rpc("unmute_user", {
    p_user_id: targetUserId,
  });

  if (unmuteError) {
    console.error("[unmuteUser]", unmuteError.message);
    return { success: false, error: "Failed to unmute user" };
  }

  await logModAction(supabase, userId, targetUserId, "unmute", {});

  revalidatePath("/moderation/reports");
  return { success: true, data: undefined };
}
