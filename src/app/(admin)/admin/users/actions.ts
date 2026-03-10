"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/notifications";
import type {
  ActionResult,
  AdminAction,
  AdminAuditLogEntry,
  AdminUserFilters,
  AdminUserRow,
  AdminUsersResult,
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
// Guard: prevent admin-on-admin and self-modification
// =============================================================================

async function guardTarget(
  supabase: Awaited<ReturnType<typeof createClient>>,
  adminId: string,
  targetUserId: string,
  blockAdminTargets = true
): Promise<{ error: string | null; targetRole: string | null }> {
  if (adminId === targetUserId) {
    return { error: "You cannot modify your own account.", targetRole: null };
  }

  const { data: target } = await supabase
    .from("users")
    .select("role")
    .eq("id", targetUserId)
    .single();

  if (!target) {
    return { error: "User not found.", targetRole: null };
  }

  if (blockAdminTargets && target.role === "admin") {
    return { error: "Cannot perform this action on another admin.", targetRole: target.role };
  }

  return { error: null, targetRole: target.role };
}

// =============================================================================
// Queries
// =============================================================================

export async function getAdminUsers(
  filters: AdminUserFilters
): Promise<ActionResult<AdminUsersResult>> {
  const { supabase, error: authError } = await assertAdmin();
  if (authError || !supabase) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  try {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    // Build the query — join users with profiles and industries
    let query = supabase
      .from("users")
      .select(
        `
        id,
        email,
        role,
        verification_status,
        is_active,
        suspended_until,
        ban_reason,
        created_at,
        profiles!left (
          full_name,
          photo_url,
          graduation_year,
          last_active_at,
          primary_industry_id
        )
      `,
        { count: "exact" }
      );

    // Apply filters
    if (filters.role) {
      query = query.eq("role", filters.role);
    }
    if (filters.verificationStatus) {
      query = query.eq("verification_status", filters.verificationStatus);
    }
    if (filters.isActive !== undefined) {
      query = query.eq("is_active", filters.isActive);
    }

    // Search by name or email
    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      query = query.or(`email.ilike.${term}`);
    }

    // Order and paginate
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error("[ServerAction:getAdminUsers]", { error: error.message });
      return { success: false, error: "Failed to fetch users." };
    }

    // Fetch industry names for users that have a primary_industry_id
    const industryIds = new Set<string>();
    for (const row of data ?? []) {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      if (profile?.primary_industry_id) {
        industryIds.add(profile.primary_industry_id);
      }
    }

    let industryMap: Record<string, string> = {};
    if (industryIds.size > 0) {
      const { data: industries } = await supabase
        .from("industries")
        .select("id, name")
        .in("id", Array.from(industryIds));

      if (industries) {
        industryMap = Object.fromEntries(industries.map((i) => [i.id, i.name]));
      }
    }

    // If search includes a name term, we need to also search profiles
    // Since we can't do OR across tables in Supabase, we do a second query for name matches
    let nameMatchIds: string[] | null = null;
    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      const { data: nameMatches } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("full_name", term);

      if (nameMatches && nameMatches.length > 0) {
        nameMatchIds = nameMatches.map((m) => m.user_id);
      }
    }

    // If we have name matches, do a second query to get those users too
    let allData = data ?? [];
    let totalCount = count ?? 0;

    if (nameMatchIds && nameMatchIds.length > 0) {
      const existingIds = new Set(allData.map((u) => u.id));
      const missingIds = nameMatchIds.filter((id) => !existingIds.has(id));

      if (missingIds.length > 0) {
        let nameQuery = supabase
          .from("users")
          .select(
            `
            id,
            email,
            role,
            verification_status,
            is_active,
            suspended_until,
            ban_reason,
            created_at,
            profiles!left (
              full_name,
              photo_url,
              graduation_year,
              last_active_at,
              primary_industry_id
            )
          `
          )
          .in("id", missingIds);

        if (filters.role) nameQuery = nameQuery.eq("role", filters.role);
        if (filters.verificationStatus) nameQuery = nameQuery.eq("verification_status", filters.verificationStatus);
        if (filters.isActive !== undefined) nameQuery = nameQuery.eq("is_active", filters.isActive);

        const { data: nameData } = await nameQuery;
        if (nameData) {
          allData = [...allData, ...nameData];
          totalCount = totalCount + nameData.length;
        }
      }
    }

    // Map to AdminUserRow
    const users: AdminUserRow[] = allData.map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        id: row.id,
        email: row.email,
        role: row.role as AdminUserRow["role"],
        verification_status: row.verification_status as AdminUserRow["verification_status"],
        is_active: row.is_active,
        suspended_until: row.suspended_until,
        ban_reason: row.ban_reason,
        created_at: row.created_at,
        full_name: profile?.full_name ?? null,
        photo_url: profile?.photo_url ?? null,
        graduation_year: profile?.graduation_year ?? null,
        primary_industry_name: profile?.primary_industry_id
          ? industryMap[profile.primary_industry_id] ?? null
          : null,
        last_active_at: profile?.last_active_at ?? null,
      };
    });

    // Sort: name matches first when searching, then by created_at desc
    if (filters.search) {
      users.sort((a, b) => {
        const aDate = new Date(a.created_at).getTime();
        const bDate = new Date(b.created_at).getTime();
        return bDate - aDate;
      });
    }

    // Deduplicate (in case of overlapping email + name match)
    const seen = new Set<string>();
    const deduped = users.filter((u) => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });

    const finalUsers = deduped.slice(0, pageSize);
    const finalTotal = Math.max(totalCount, deduped.length);

    return {
      success: true,
      data: {
        users: finalUsers,
        totalCount: finalTotal,
        page,
        pageSize,
        totalPages: Math.ceil(finalTotal / pageSize),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:getAdminUsers]", { error: message });
    return { success: false, error: "Something went wrong." };
  }
}

export async function getUserAuditLog(
  targetUserId: string
): Promise<ActionResult<AdminAuditLogEntry[]>> {
  const { supabase, error: authError } = await assertAdmin();
  if (authError || !supabase) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  try {
    const { data, error } = await supabase
      .from("admin_audit_log")
      .select("*")
      .eq("target_user_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[ServerAction:getUserAuditLog]", { error: error.message });
      return { success: false, error: "Failed to fetch audit log." };
    }

    // Get admin names
    const adminIds = [...new Set((data ?? []).map((e) => e.admin_id))];
    let adminNameMap: Record<string, string> = {};
    if (adminIds.length > 0) {
      const { data: adminProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", adminIds);

      if (adminProfiles) {
        adminNameMap = Object.fromEntries(
          adminProfiles.map((p) => [p.user_id, p.full_name])
        );
      }
    }

    const entries: AdminAuditLogEntry[] = (data ?? []).map((row) => ({
      id: row.id,
      admin_id: row.admin_id,
      target_user_id: row.target_user_id,
      action: row.action as AdminAction,
      details: (row.details as Record<string, unknown>) ?? {},
      created_at: row.created_at,
      admin_name: adminNameMap[row.admin_id] ?? null,
    }));

    return { success: true, data: entries };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:getUserAuditLog]", { error: message });
    return { success: false, error: "Something went wrong." };
  }
}

// =============================================================================
// Actions
// =============================================================================

export async function banUser(
  targetUserId: string,
  reason: string
): Promise<ActionResult> {
  const { supabase, userId, error: authError } = await assertAdmin();
  if (authError || !supabase || !userId) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  try {
    const { error: guardError } = await guardTarget(supabase, userId, targetUserId);
    if (guardError) return { success: false, error: guardError };

    const { error: updateError } = await supabase
      .from("users")
      .update({
        is_active: false,
        ban_reason: reason || "Banned by admin",
        suspended_until: null,
      })
      .eq("id", targetUserId);

    if (updateError) {
      console.error("[ServerAction:banUser]", { adminId: userId, targetUserId, error: updateError.message });
      return { success: false, error: "Failed to ban user." };
    }

    await logAdminAction(supabase, userId, targetUserId, "ban", { reason });

    notifyUser(
      targetUserId,
      "verification_update",
      "Account suspended",
      "Your account has been permanently suspended. Contact support if you believe this is an error."
    );

    revalidatePath("/admin/users");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:banUser]", { adminId: userId, targetUserId, error: message });
    return { success: false, error: "Something went wrong." };
  }
}

export async function unbanUser(targetUserId: string): Promise<ActionResult> {
  const { supabase, userId, error: authError } = await assertAdmin();
  if (authError || !supabase || !userId) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  try {
    const { error: guardError } = await guardTarget(supabase, userId, targetUserId, false);
    if (guardError) return { success: false, error: guardError };

    const { error: updateError } = await supabase
      .from("users")
      .update({
        is_active: true,
        ban_reason: null,
      })
      .eq("id", targetUserId);

    if (updateError) {
      console.error("[ServerAction:unbanUser]", { adminId: userId, targetUserId, error: updateError.message });
      return { success: false, error: "Failed to unban user." };
    }

    await logAdminAction(supabase, userId, targetUserId, "unban", {});

    revalidatePath("/admin/users");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:unbanUser]", { adminId: userId, targetUserId, error: message });
    return { success: false, error: "Something went wrong." };
  }
}

export async function suspendUser(
  targetUserId: string,
  days: number,
  reason: string
): Promise<ActionResult> {
  const { supabase, userId, error: authError } = await assertAdmin();
  if (authError || !supabase || !userId) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  try {
    const { error: guardError } = await guardTarget(supabase, userId, targetUserId);
    if (guardError) return { success: false, error: guardError };

    if (![1, 7, 30, 90].includes(days)) {
      return { success: false, error: "Invalid suspension duration." };
    }

    const suspendedUntil = new Date();
    suspendedUntil.setDate(suspendedUntil.getDate() + days);

    const { error: updateError } = await supabase
      .from("users")
      .update({ suspended_until: suspendedUntil.toISOString() })
      .eq("id", targetUserId);

    if (updateError) {
      console.error("[ServerAction:suspendUser]", { adminId: userId, targetUserId, error: updateError.message });
      return { success: false, error: "Failed to suspend user." };
    }

    await logAdminAction(supabase, userId, targetUserId, "suspend", { days, reason });

    notifyUser(
      targetUserId,
      "verification_update",
      "Account temporarily suspended",
      `Your account has been suspended for ${days} day${days !== 1 ? "s" : ""}. ${reason ? `Reason: ${reason}` : ""}`.trim()
    );

    revalidatePath("/admin/users");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:suspendUser]", { adminId: userId, targetUserId, error: message });
    return { success: false, error: "Something went wrong." };
  }
}

export async function unsuspendUser(targetUserId: string): Promise<ActionResult> {
  const { supabase, userId, error: authError } = await assertAdmin();
  if (authError || !supabase || !userId) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  try {
    const { error: guardError } = await guardTarget(supabase, userId, targetUserId, false);
    if (guardError) return { success: false, error: guardError };

    const { error: updateError } = await supabase
      .from("users")
      .update({ suspended_until: null })
      .eq("id", targetUserId);

    if (updateError) {
      console.error("[ServerAction:unsuspendUser]", { adminId: userId, targetUserId, error: updateError.message });
      return { success: false, error: "Failed to unsuspend user." };
    }

    await logAdminAction(supabase, userId, targetUserId, "unsuspend", {});

    notifyUser(
      targetUserId,
      "verification_update",
      "Account reinstated",
      "Your account suspension has been lifted. You can now access the platform normally."
    );

    revalidatePath("/admin/users");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:unsuspendUser]", { adminId: userId, targetUserId, error: message });
    return { success: false, error: "Something went wrong." };
  }
}

export async function promoteToModerator(targetUserId: string): Promise<ActionResult> {
  const { supabase, userId, error: authError } = await assertAdmin();
  if (authError || !supabase || !userId) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  try {
    const { error: guardError, targetRole } = await guardTarget(supabase, userId, targetUserId, false);
    if (guardError) return { success: false, error: guardError };

    if (targetRole === "admin") {
      return { success: false, error: "Cannot modify another admin's role." };
    }
    if (targetRole === "moderator") {
      return { success: false, error: "User is already a moderator." };
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({ role: "moderator" })
      .eq("id", targetUserId);

    if (updateError) {
      console.error("[ServerAction:promoteToModerator]", { adminId: userId, targetUserId, error: updateError.message });
      return { success: false, error: "Failed to promote user." };
    }

    await logAdminAction(supabase, userId, targetUserId, "promote", { from: targetRole, to: "moderator" });

    notifyUser(
      targetUserId,
      "verification_update",
      "Role updated",
      "You have been promoted to Moderator. You can now access the moderation tools."
    );

    revalidatePath("/admin/users");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:promoteToModerator]", { adminId: userId, targetUserId, error: message });
    return { success: false, error: "Something went wrong." };
  }
}

export async function demoteToUser(targetUserId: string): Promise<ActionResult> {
  const { supabase, userId, error: authError } = await assertAdmin();
  if (authError || !supabase || !userId) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  try {
    const { error: guardError, targetRole } = await guardTarget(supabase, userId, targetUserId, false);
    if (guardError) return { success: false, error: guardError };

    if (targetRole === "admin") {
      return { success: false, error: "Cannot demote another admin." };
    }
    if (targetRole === "user") {
      return { success: false, error: "User already has the 'user' role." };
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({ role: "user" })
      .eq("id", targetUserId);

    if (updateError) {
      console.error("[ServerAction:demoteToUser]", { adminId: userId, targetUserId, error: updateError.message });
      return { success: false, error: "Failed to demote user." };
    }

    await logAdminAction(supabase, userId, targetUserId, "demote", { from: targetRole, to: "user" });

    notifyUser(
      targetUserId,
      "verification_update",
      "Role updated",
      "Your role has been changed to regular user."
    );

    revalidatePath("/admin/users");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:demoteToUser]", { adminId: userId, targetUserId, error: message });
    return { success: false, error: "Something went wrong." };
  }
}

export async function adminVerifyUser(targetUserId: string): Promise<ActionResult> {
  const { supabase, userId, error: authError } = await assertAdmin();
  if (authError || !supabase || !userId) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  try {
    const { error: guardError } = await guardTarget(supabase, userId, targetUserId, false);
    if (guardError) return { success: false, error: guardError };

    const { data: target } = await supabase
      .from("users")
      .select("verification_status")
      .eq("id", targetUserId)
      .single();

    if (target?.verification_status === "verified") {
      return { success: false, error: "User is already verified." };
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({ verification_status: "verified" })
      .eq("id", targetUserId);

    if (updateError) {
      console.error("[ServerAction:adminVerifyUser]", { adminId: userId, targetUserId, error: updateError.message });
      return { success: false, error: "Failed to verify user." };
    }

    await logAdminAction(supabase, userId, targetUserId, "verify", {});

    notifyUser(
      targetUserId,
      "verification_update",
      "Verification approved!",
      "Your alumni status has been verified. You now have full access to the platform.",
      "/dashboard",
      { verificationStatus: "approved" }
    );

    revalidatePath("/admin/users");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:adminVerifyUser]", { adminId: userId, targetUserId, error: message });
    return { success: false, error: "Something went wrong." };
  }
}

export async function adminDeleteUser(targetUserId: string): Promise<ActionResult> {
  const { supabase, userId, error: authError } = await assertAdmin();
  if (authError || !supabase || !userId) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  try {
    const { error: guardError } = await guardTarget(supabase, userId, targetUserId);
    if (guardError) return { success: false, error: guardError };

    const { error: updateError } = await supabase
      .from("users")
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", targetUserId);

    if (updateError) {
      console.error("[ServerAction:adminDeleteUser]", { adminId: userId, targetUserId, error: updateError.message });
      return { success: false, error: "Failed to delete user." };
    }

    await logAdminAction(supabase, userId, targetUserId, "delete", {});

    revalidatePath("/admin/users");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:adminDeleteUser]", { adminId: userId, targetUserId, error: message });
    return { success: false, error: "Something went wrong." };
  }
}
