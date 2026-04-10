"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { notifyUserGrouped } from "@/lib/notifications";
import type { ActionResult, EventCommentWithAuthor } from "@/lib/types";

// =============================================================================
// Validation schemas
// =============================================================================

const addCommentSchema = z.object({
  eventId: z.string().uuid(),
  body: z.string().min(1, "Comment cannot be empty").max(2000, "Comment is too long"),
});

const reportCommentSchema = z.object({
  commentId: z.string().uuid(),
  reason: z.string().min(10, "Reason must be at least 10 characters").max(1000),
});

// =============================================================================
// getEventComments
// =============================================================================

export async function getEventComments(
  eventId: string,
  page = 1,
  pageSize = 20
): Promise<
  ActionResult<{
    comments: EventCommentWithAuthor[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const offset = (page - 1) * pageSize;

    // Count total (non-deleted only for count, but we show deleted as placeholders)
    const { count: totalCount } = await supabase
      .from("event_comments")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId);

    const total = totalCount ?? 0;

    const { data: comments, error } = await supabase
      .from("event_comments")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("[ServerAction:getEventComments]", { error: error.message });
      return { success: false, error: "Failed to load comments" };
    }

    // Enrich with author profiles
    const userIds = [...new Set((comments ?? []).map((c) => c.user_id))];
    const profileMap: Record<string, { full_name: string | null; photo_url: string | null }> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, photo_url")
        .in("user_id", userIds);

      for (const p of profiles ?? []) {
        profileMap[p.user_id] = { full_name: p.full_name, photo_url: p.photo_url };
      }
    }

    const enriched: EventCommentWithAuthor[] = (comments ?? []).map((c) => ({
      ...c,
      author_name: profileMap[c.user_id]?.full_name ?? null,
      author_photo_url: profileMap[c.user_id]?.photo_url ?? null,
    }));

    return {
      success: true,
      data: {
        comments: enriched,
        totalCount: total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ServerAction:getEventComments]", { error: message });
    return { success: false, error: "Failed to load comments" };
  }
}

// =============================================================================
// addEventComment
// =============================================================================

export async function addEventComment(
  eventId: string,
  body: string
): Promise<ActionResult<EventCommentWithAuthor>> {
  const parsed = addCommentSchema.safeParse({ eventId, body });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Verified + mute check
    const { data: userData } = await supabase
      .from("users")
      .select("verification_status, muted_until")
      .eq("id", user.id)
      .single();

    if (!userData || userData.verification_status !== "verified") {
      return { success: false, error: "You must be verified to comment." };
    }

    if (userData.muted_until && new Date(userData.muted_until) > new Date()) {
      const mutedUntil = new Date(userData.muted_until).toLocaleDateString();
      return {
        success: false,
        error: `Your account is temporarily restricted until ${mutedUntil}.`,
      };
    }

    // Verify event exists and is not deleted
    const { data: event } = await supabase
      .from("events")
      .select("id, title, creator_id")
      .eq("id", eventId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!event) return { success: false, error: "Event not found." };

    // Insert comment
    const { data: comment, error } = await supabase
      .from("event_comments")
      .insert({
        event_id: eventId,
        user_id: user.id,
        body: parsed.data.body,
      })
      .select()
      .single();

    if (error || !comment) {
      console.error("[ServerAction:addEventComment]", {
        userId: user.id,
        eventId,
        error: error?.message,
      });
      return { success: false, error: "Failed to post comment." };
    }

    // Get author profile for response
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, photo_url")
      .eq("user_id", user.id)
      .maybeSingle();

    const authorName = profile?.full_name ?? "Someone";

    // Fire-and-forget: notify host + prior commenters
    void notifyCommentRecipients(
      supabase,
      eventId,
      event.title,
      event.creator_id,
      user.id,
      authorName,
      parsed.data.body
    );

    revalidatePath(`/events/${eventId}`);

    return {
      success: true,
      data: {
        ...comment,
        author_name: profile?.full_name ?? null,
        author_photo_url: profile?.photo_url ?? null,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ServerAction:addEventComment]", { error: message });
    return { success: false, error: "Failed to post comment." };
  }
}

// =============================================================================
// deleteEventComment (soft-delete, author only)
// =============================================================================

export async function deleteEventComment(
  commentId: string
): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(commentId).success) {
    return { success: false, error: "Invalid comment ID." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { data: comment } = await supabase
      .from("event_comments")
      .select("id, user_id, event_id")
      .eq("id", commentId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!comment) return { success: false, error: "Comment not found." };
    if (comment.user_id !== user.id) {
      return { success: false, error: "You can only delete your own comments." };
    }

    const { error } = await supabase
      .from("event_comments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", commentId);

    if (error) {
      console.error("[ServerAction:deleteEventComment]", { error: error.message });
      return { success: false, error: "Failed to delete comment." };
    }

    revalidatePath(`/events/${comment.event_id}`);
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ServerAction:deleteEventComment]", { error: message });
    return { success: false, error: "Failed to delete comment." };
  }
}

// =============================================================================
// reportEventComment
// =============================================================================

export async function reportEventComment(
  commentId: string,
  reason: string
): Promise<ActionResult> {
  const parsed = reportCommentSchema.safeParse({ commentId, reason });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Can't report own comments
    const { data: comment } = await supabase
      .from("event_comments")
      .select("id, user_id")
      .eq("id", commentId)
      .maybeSingle();

    if (!comment) return { success: false, error: "Comment not found." };
    if (comment.user_id === user.id) {
      return { success: false, error: "You cannot report your own comment." };
    }

    const { error } = await supabase
      .from("event_comment_reports")
      .insert({
        comment_id: commentId,
        reporter_id: user.id,
        reason: parsed.data.reason,
      });

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "You have already reported this comment." };
      }
      console.error("[ServerAction:reportEventComment]", { error: error.message });
      return { success: false, error: "Failed to submit report." };
    }

    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ServerAction:reportEventComment]", { error: message });
    return { success: false, error: "Failed to submit report." };
  }
}

// =============================================================================
// Internal: notify host + prior commenters (fire-and-forget)
// =============================================================================

async function notifyCommentRecipients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  eventTitle: string,
  hostId: string,
  commenterId: string,
  commenterName: string,
  commentBody: string
) {
  try {
    // Collect all distinct commenters on this event (excluding the current commenter)
    const { data: priorCommenters } = await supabase
      .from("event_comments")
      .select("user_id")
      .eq("event_id", eventId)
      .is("deleted_at", null)
      .neq("user_id", commenterId);

    const recipients = new Set<string>();
    // Always include the host
    if (hostId !== commenterId) {
      recipients.add(hostId);
    }
    // Add prior commenters
    for (const c of priorCommenters ?? []) {
      if (c.user_id !== commenterId) {
        recipients.add(c.user_id);
      }
    }

    const preview = commentBody.length > 80 ? commentBody.slice(0, 77) + "..." : commentBody;
    const link = `/events/${eventId}`;

    await Promise.all(
      Array.from(recipients).map((uid) =>
        notifyUserGrouped(
          uid,
          "event_comment",
          commenterName,
          `${commenterName} commented on "${eventTitle}": ${preview}`,
          link,
          { actorName: commenterName, eventTitle }
        )
      )
    );
  } catch (err) {
    console.error("[events:notifyCommentRecipients]", {
      eventId,
      error: (err as Error).message,
    });
  }
}
