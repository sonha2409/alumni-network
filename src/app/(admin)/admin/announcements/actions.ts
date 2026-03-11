"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/notifications";
import type {
  ActionResult,
  AdminAction,
  AnnouncementWithAuthor,
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

async function logAnnouncementAction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  adminId: string,
  action: AdminAction,
  details: Record<string, unknown> = {}
) {
  const { error } = await supabase.rpc("insert_audit_log", {
    p_admin_id: adminId,
    p_target_user_id: adminId, // self-reference for non-user actions
    p_action: action,
    p_details: details,
  });

  if (error) {
    console.error("[AuditLog:announcement]", { adminId, action, error: error.message });
  }
}

// =============================================================================
// Validation schemas
// =============================================================================

const announcementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer"),
  body: z
    .string()
    .trim()
    .min(1, "Body is required")
    .max(2000, "Body must be 2000 characters or fewer"),
  link: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .max(500, "Link must be 500 characters or fewer")
    .optional()
    .or(z.literal("")),
});

// =============================================================================
// Get all announcements (admin view — includes inactive)
// =============================================================================

export async function getAnnouncements(): Promise<ActionResult<AnnouncementWithAuthor[]>> {
  const { supabase, error: authError } = await assertAdmin();
  if (authError || !supabase) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  try {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[ServerAction:getAnnouncements]", { error: error.message });
      return { success: false, error: "Failed to load announcements." };
    }

    // Fetch author names from profiles (profiles.id = users.id)
    const authorIds = [...new Set((data ?? []).map((r) => r.created_by))];
    const { data: profiles } = authorIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", authorIds)
      : { data: [] };

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p.full_name])
    );

    const announcements: AnnouncementWithAuthor[] = (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      link: row.link,
      created_by: row.created_by,
      is_active: row.is_active,
      published_at: row.published_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      author_name: profileMap.get(row.created_by) ?? null,
    }));

    return { success: true, data: announcements };
  } catch (err) {
    console.error("[ServerAction:getAnnouncements]", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return { success: false, error: "An unexpected error occurred." };
  }
}

// =============================================================================
// Create announcement + broadcast notifications
// =============================================================================

export async function createAnnouncement(
  formData: { title: string; body: string; link?: string }
): Promise<ActionResult<{ id: string }>> {
  const { supabase, userId, error: authError } = await assertAdmin();
  if (authError || !supabase || !userId) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  const parsed = announcementSchema.safeParse(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
      if (messages) fieldErrors[key] = messages;
    }
    return { success: false, error: "Validation failed.", fieldErrors };
  }

  const { title, body, link } = parsed.data;

  try {
    const { data, error } = await supabase
      .from("announcements")
      .insert({
        title,
        body,
        link: link || null,
        created_by: userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[ServerAction:createAnnouncement]", { userId, error: error.message });
      return { success: false, error: "Failed to create announcement." };
    }

    // Audit log
    await logAnnouncementAction(supabase, userId, "create_announcement", {
      announcement_id: data.id,
      title,
    });

    // Broadcast notification to all verified users (fire-and-forget)
    broadcastAnnouncementNotification(title, body, link || undefined).catch((err) => {
      console.error("[ServerAction:createAnnouncement:broadcast]", {
        error: err instanceof Error ? err.message : "Unknown error",
      });
    });

    revalidatePath("/admin/announcements");
    return { success: true, data: { id: data.id } };
  } catch (err) {
    console.error("[ServerAction:createAnnouncement]", {
      userId,
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return { success: false, error: "An unexpected error occurred." };
  }
}

// =============================================================================
// Update announcement
// =============================================================================

export async function updateAnnouncement(
  id: string,
  formData: { title: string; body: string; link?: string }
): Promise<ActionResult<void>> {
  const { supabase, userId, error: authError } = await assertAdmin();
  if (authError || !supabase || !userId) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  if (!id) return { success: false, error: "Announcement ID is required." };

  const parsed = announcementSchema.safeParse(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
      if (messages) fieldErrors[key] = messages;
    }
    return { success: false, error: "Validation failed.", fieldErrors };
  }

  const { title, body, link } = parsed.data;

  try {
    const { error } = await supabase
      .from("announcements")
      .update({
        title,
        body,
        link: link || null,
      })
      .eq("id", id);

    if (error) {
      console.error("[ServerAction:updateAnnouncement]", { userId, error: error.message });
      return { success: false, error: "Failed to update announcement." };
    }

    await logAnnouncementAction(supabase, userId, "update_announcement", {
      announcement_id: id,
      title,
    });

    revalidatePath("/admin/announcements");
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[ServerAction:updateAnnouncement]", {
      userId,
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return { success: false, error: "An unexpected error occurred." };
  }
}

// =============================================================================
// Toggle announcement active status
// =============================================================================

export async function toggleAnnouncement(
  id: string,
  isActive: boolean
): Promise<ActionResult<void>> {
  const { supabase, userId, error: authError } = await assertAdmin();
  if (authError || !supabase || !userId) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  if (!id) return { success: false, error: "Announcement ID is required." };

  try {
    const { error } = await supabase
      .from("announcements")
      .update({ is_active: isActive })
      .eq("id", id);

    if (error) {
      console.error("[ServerAction:toggleAnnouncement]", { userId, error: error.message });
      return { success: false, error: "Failed to update announcement status." };
    }

    await logAnnouncementAction(supabase, userId, "toggle_announcement", {
      announcement_id: id,
      is_active: isActive,
    });

    revalidatePath("/admin/announcements");
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[ServerAction:toggleAnnouncement]", {
      userId,
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return { success: false, error: "An unexpected error occurred." };
  }
}

// =============================================================================
// Delete announcement
// =============================================================================

export async function deleteAnnouncement(id: string): Promise<ActionResult<void>> {
  const { supabase, userId, error: authError } = await assertAdmin();
  if (authError || !supabase || !userId) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  if (!id) return { success: false, error: "Announcement ID is required." };

  try {
    // Fetch title for audit log before deleting
    const { data: existing } = await supabase
      .from("announcements")
      .select("title")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[ServerAction:deleteAnnouncement]", { userId, error: error.message });
      return { success: false, error: "Failed to delete announcement." };
    }

    await logAnnouncementAction(supabase, userId, "delete_announcement", {
      announcement_id: id,
      title: existing?.title ?? "Unknown",
    });

    revalidatePath("/admin/announcements");
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[ServerAction:deleteAnnouncement]", {
      userId,
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return { success: false, error: "An unexpected error occurred." };
  }
}

// =============================================================================
// Broadcast helper — notifies all verified users
// =============================================================================

async function broadcastAnnouncementNotification(
  title: string,
  body: string,
  link?: string
): Promise<void> {
  const supabase = await createClient();

  // Fetch all verified user IDs
  const { data: users, error } = await supabase
    .from("users")
    .select("id")
    .eq("verification_status", "verified")
    .eq("is_active", true);

  if (error) {
    console.error("[broadcastAnnouncement]", { error: error.message });
    return;
  }

  if (!users || users.length === 0) return;

  console.log(`[broadcastAnnouncement] Notifying ${users.length} verified users`);

  // Fire-and-forget for each user — notifyUser already handles errors internally
  const promises = users.map((u) =>
    notifyUser(u.id, "announcement", title, body, link, {
      actorName: title,
      announcementBody: body,
    })
  );

  await Promise.allSettled(promises);

  console.log(`[broadcastAnnouncement] Broadcast complete for ${users.length} users`);
}
