"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { bulkInviteEmail } from "@/lib/email-templates";
import type {
  ActionResult,
  AdminAction,
  BulkInviteHistoryResult,
  BulkInviteResult,
} from "@/lib/types";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const MAX_CSV_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_ROWS = 500;
const CURRENT_YEAR = new Date().getFullYear();

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
    return { supabase: null, userId: null, adminName: null, error: "Unauthorized" };
  }

  // Fetch admin name from profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return {
    supabase,
    userId: user.id,
    adminName: profile?.full_name ?? "An admin",
    error: null,
  };
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
// CSV parsing
// =============================================================================

const rowSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().optional().default(""),
  graduation_year: z
    .string()
    .optional()
    .default("")
    .transform((v) => {
      if (!v || v.trim() === "") return null;
      const n = parseInt(v.trim(), 10);
      if (isNaN(n)) return undefined; // will fail refinement
      return n;
    })
    .refine((v) => v === null || (typeof v === "number" && v >= 1999 && v <= CURRENT_YEAR + 3), {
      message: `Graduation year must be between 1999 and ${CURRENT_YEAR + 3}`,
    }),
});

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

// =============================================================================
// Process CSV upload
// =============================================================================

export async function processBulkInviteCSV(
  formData: FormData
): Promise<ActionResult<BulkInviteResult>> {
  const { supabase, userId, adminName, error } = await assertAdmin();
  if (error || !supabase || !userId) {
    return { success: false, error: error ?? "Unauthorized" };
  }

  const file = formData.get("csv") as File | null;
  if (!file || file.size === 0) {
    return {
      success: false,
      error: "No file provided.",
      fieldErrors: { csv: ["Please select a CSV file to upload."] },
    };
  }

  if (file.size > MAX_CSV_SIZE) {
    return {
      success: false,
      error: "File too large.",
      fieldErrors: { csv: ["CSV file must be under 2MB."] },
    };
  }

  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith(".csv")) {
    return {
      success: false,
      error: "Invalid file type.",
      fieldErrors: { csv: ["Only .csv files are accepted."] },
    };
  }

  const text = await file.text();
  const { headers, rows } = parseCSV(text);

  if (!headers.includes("email")) {
    return {
      success: false,
      error: "CSV must have an 'email' column.",
      fieldErrors: { csv: ["Missing required 'email' column header."] },
    };
  }

  if (rows.length === 0) {
    return {
      success: false,
      error: "CSV has no data rows.",
      fieldErrors: { csv: ["The CSV file is empty."] },
    };
  }

  if (rows.length > MAX_ROWS) {
    return {
      success: false,
      error: `Too many rows. Maximum is ${MAX_ROWS}.`,
      fieldErrors: { csv: [`CSV exceeds the ${MAX_ROWS} row limit.`] },
    };
  }

  // Validate and deduplicate
  const seenEmails = new Set<string>();
  const validRows: { email: string; name: string | null; graduation_year: number | null }[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const result = rowSchema.safeParse(row);

    if (!result.success) {
      const issues = result.error.issues.map((iss) => iss.message).join(", ");
      errors.push(`Row ${i + 2}: ${issues}`);
      continue;
    }

    const email = result.data.email.toLowerCase();

    if (seenEmails.has(email)) {
      errors.push(`Row ${i + 2}: Duplicate email '${email}' in CSV`);
      continue;
    }
    seenEmails.add(email);

    validRows.push({
      email,
      name: result.data.name?.trim() || null,
      graduation_year: result.data.graduation_year ?? null,
    });
  }

  if (validRows.length === 0) {
    return {
      success: false,
      error: "No valid rows found in CSV.",
      fieldErrors: { csv: errors.slice(0, 10) },
    };
  }

  // Check which emails already exist in bulk_invites or users tables
  const emails = validRows.map((r) => r.email);

  const [existingInvites, existingUsers] = await Promise.all([
    supabase.from("bulk_invites").select("email").in("email", emails),
    supabase.from("users").select("email").in("email", emails),
  ]);

  const alreadyInvited = new Set(
    (existingInvites.data ?? []).map((r: { email: string }) => r.email.toLowerCase())
  );
  const alreadyUsers = new Set(
    (existingUsers.data ?? []).map((r: { email: string }) => r.email.toLowerCase())
  );

  const toInsert = validRows.filter((r) => {
    if (alreadyUsers.has(r.email)) {
      errors.push(`${r.email}: Already a registered user`);
      return false;
    }
    if (alreadyInvited.has(r.email)) {
      errors.push(`${r.email}: Already invited`);
      return false;
    }
    return true;
  });

  if (toInsert.length === 0) {
    return {
      success: true,
      data: {
        sent: 0,
        skipped: validRows.length,
        errors: errors.slice(0, 20),
      },
    };
  }

  // Insert into bulk_invites
  const { error: insertError } = await supabase.from("bulk_invites").insert(
    toInsert.map((r) => ({
      email: r.email,
      name: r.name,
      graduation_year: r.graduation_year,
      invited_by: userId,
    }))
  );

  if (insertError) {
    console.error("[ServerAction:processBulkInviteCSV]", {
      userId,
      error: insertError.message,
    });
    return { success: false, error: "Failed to save invites. Please try again." };
  }

  // Send invite emails (fire-and-forget)
  for (const row of toInsert) {
    const signupUrl = `${siteUrl}/signup?email=${encodeURIComponent(row.email)}`;
    const { subject, html } = bulkInviteEmail(adminName ?? "An admin", signupUrl);
    sendEmail(row.email, subject, html);
  }

  // Audit log
  await logAdminAction(supabase, userId, userId, "bulk_invite", {
    count: toInsert.length,
    skipped: validRows.length - toInsert.length,
  });

  revalidatePath("/admin/bulk-invite");

  return {
    success: true,
    data: {
      sent: toInsert.length,
      skipped: validRows.length - toInsert.length,
      errors: errors.slice(0, 20),
    },
  };
}

// =============================================================================
// Get invite history
// =============================================================================

export async function getInviteHistory(
  page: number = 1,
  pageSize: number = 20
): Promise<ActionResult<BulkInviteHistoryResult>> {
  const { supabase, error } = await assertAdmin();
  if (error || !supabase) {
    return { success: false, error: error ?? "Unauthorized" };
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const [countResult, dataResult] = await Promise.all([
    supabase.from("bulk_invites").select("id", { count: "exact", head: true }),
    supabase
      .from("bulk_invites")
      .select("id, email, name, graduation_year, invited_by, status, invited_at, signed_up_at, created_at")
      .order("invited_at", { ascending: false })
      .range(from, to),
  ]);

  if (dataResult.error) {
    console.error("[ServerAction:getInviteHistory]", { error: dataResult.error.message });
    return { success: false, error: "Failed to load invite history." };
  }

  const totalCount = countResult.count ?? 0;

  return {
    success: true,
    data: {
      invites: dataResult.data ?? [],
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

// =============================================================================
// Resend a single invite
// =============================================================================

export async function resendInvite(inviteId: string): Promise<ActionResult> {
  const { supabase, userId, adminName, error } = await assertAdmin();
  if (error || !supabase || !userId) {
    return { success: false, error: error ?? "Unauthorized" };
  }

  const { data: invite, error: fetchError } = await supabase
    .from("bulk_invites")
    .select("id, email, status")
    .eq("id", inviteId)
    .single();

  if (fetchError || !invite) {
    return { success: false, error: "Invite not found." };
  }

  if (invite.status !== "invited") {
    return { success: false, error: "Can only resend invites that haven't been used yet." };
  }

  const signupUrl = `${siteUrl}/signup?email=${encodeURIComponent(invite.email)}`;
  const { subject, html } = bulkInviteEmail(adminName ?? "An admin", signupUrl);
  await sendEmail(invite.email, subject, html);

  await logAdminAction(supabase, userId, userId, "resend_invite", {
    invite_id: inviteId,
    email: invite.email,
  });

  return { success: true, data: undefined };
}
