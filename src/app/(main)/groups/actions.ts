"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Group } from "@/lib/types";

/**
 * Generate a URL-safe slug from a group name.
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// =============================================================================
// Admin Actions
// =============================================================================

/**
 * Create a new group. Admin only.
 */
export async function createGroup(formData: FormData): Promise<ActionResult<Group>> {
  const schema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be under 100 characters"),
    description: z.string().max(1000, "Description must be under 1,000 characters").optional(),
    type: z.enum(["year_based", "field_based", "location_based", "custom"]),
  });

  const parsed = schema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    type: formData.get("type"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  // Check admin role
  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!currentUser || currentUser.role !== "admin") {
    return { success: false, error: "Only admins can create groups." };
  }

  const slug = generateSlug(parsed.data.name);

  if (!slug) {
    return { success: false, error: "Group name must contain at least one letter or number." };
  }

  try {
    const { data: group, error } = await supabase
      .from("groups")
      .insert({
        name: parsed.data.name,
        slug,
        description: parsed.data.description || null,
        type: parsed.data.type,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "A group with this name already exists." };
      }
      console.error("[ServerAction:createGroup]", { userId: user.id, error: error.message });
      return { success: false, error: "Failed to create group. Please try again." };
    }

    revalidatePath("/groups");
    return { success: true, data: group };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:createGroup]", { userId: user.id, error: message });
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/**
 * Update a group. Admin only.
 */
export async function updateGroup(
  groupId: string,
  formData: FormData
): Promise<ActionResult<Group>> {
  const schema = z.object({
    groupId: z.string().uuid("Invalid group ID"),
    name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be under 100 characters"),
    description: z.string().max(1000, "Description must be under 1,000 characters").optional(),
    type: z.enum(["year_based", "field_based", "location_based", "custom"]),
  });

  const parsed = schema.safeParse({
    groupId,
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    type: formData.get("type"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!currentUser || currentUser.role !== "admin") {
    return { success: false, error: "Only admins can update groups." };
  }

  const slug = generateSlug(parsed.data.name);

  try {
    const { data: group, error } = await supabase
      .from("groups")
      .update({
        name: parsed.data.name,
        slug,
        description: parsed.data.description || null,
        type: parsed.data.type,
      })
      .eq("id", groupId)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "A group with this name already exists." };
      }
      console.error("[ServerAction:updateGroup]", { userId: user.id, error: error.message });
      return { success: false, error: "Failed to update group. Please try again." };
    }

    revalidatePath("/groups");
    revalidatePath(`/groups/${slug}`);
    return { success: true, data: group };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:updateGroup]", { userId: user.id, error: message });
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/**
 * Soft-delete a group. Admin only.
 */
export async function deleteGroup(groupId: string): Promise<ActionResult> {
  const schema = z.object({
    groupId: z.string().uuid("Invalid group ID"),
  });

  const parsed = schema.safeParse({ groupId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!currentUser || currentUser.role !== "admin") {
    return { success: false, error: "Only admins can delete groups." };
  }

  try {
    const { error } = await supabase
      .from("groups")
      .update({ is_active: false, deleted_at: new Date().toISOString() })
      .eq("id", groupId);

    if (error) {
      console.error("[ServerAction:deleteGroup]", { userId: user.id, error: error.message });
      return { success: false, error: "Failed to delete group. Please try again." };
    }

    revalidatePath("/groups");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:deleteGroup]", { userId: user.id, error: message });
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// =============================================================================
// Member Actions
// =============================================================================

/**
 * Join a group. Verified users only.
 */
export async function joinGroup(groupId: string): Promise<ActionResult> {
  const schema = z.object({
    groupId: z.string().uuid("Invalid group ID"),
  });

  const parsed = schema.safeParse({ groupId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  // Check verified status
  const { data: currentUser } = await supabase
    .from("users")
    .select("verification_status")
    .eq("id", user.id)
    .single();

  if (!currentUser || currentUser.verification_status !== "verified") {
    return { success: false, error: "You must be verified to join groups." };
  }

  // Check group exists and is active
  const { data: group } = await supabase
    .from("groups")
    .select("id, max_members")
    .eq("id", groupId)
    .eq("is_active", true)
    .maybeSingle();

  if (!group) {
    return { success: false, error: "Group not found." };
  }

  // Check max_members if set
  if (group.max_members) {
    const { count } = await supabase
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", groupId);

    if ((count ?? 0) >= group.max_members) {
      return { success: false, error: "This group is full." };
    }
  }

  try {
    const { error } = await supabase
      .from("group_members")
      .insert({ group_id: groupId, user_id: user.id });

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "You are already a member of this group." };
      }
      console.error("[ServerAction:joinGroup]", { userId: user.id, groupId, error: error.message });
      return { success: false, error: "Failed to join group. Please try again." };
    }

    revalidatePath("/groups");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:joinGroup]", { userId: user.id, groupId, error: message });
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/**
 * Leave a group.
 */
export async function leaveGroup(groupId: string): Promise<ActionResult> {
  const schema = z.object({
    groupId: z.string().uuid("Invalid group ID"),
  });

  const parsed = schema.safeParse({ groupId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  try {
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[ServerAction:leaveGroup]", { userId: user.id, groupId, error: error.message });
      return { success: false, error: "Failed to leave group. Please try again." };
    }

    revalidatePath("/groups");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:leaveGroup]", { userId: user.id, groupId, error: message });
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/**
 * Remove a member from a group. Admin only.
 */
export async function removeMember(
  groupId: string,
  memberId: string
): Promise<ActionResult> {
  const schema = z.object({
    groupId: z.string().uuid("Invalid group ID"),
    memberId: z.string().uuid("Invalid user ID"),
  });

  const parsed = schema.safeParse({ groupId, memberId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!currentUser || currentUser.role !== "admin") {
    return { success: false, error: "Only admins can remove members." };
  }

  try {
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", memberId);

    if (error) {
      console.error("[ServerAction:removeMember]", { userId: user.id, groupId, memberId, error: error.message });
      return { success: false, error: "Failed to remove member. Please try again." };
    }

    revalidatePath("/groups");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:removeMember]", { userId: user.id, error: message });
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
