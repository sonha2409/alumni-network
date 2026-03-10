"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type {
  ActionResult,
  AdminAction,
  AdminIndustryRow,
  AdminSpecializationRow,
  AdminTaxonomyData,
  Industry,
  Specialization,
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
// Audit log helper (taxonomy actions use null target_user_id)
// =============================================================================

async function logTaxonomyAction(
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
    console.error("[AuditLog:taxonomy]", { adminId, action, error: error.message });
  }
}

// =============================================================================
// Slug helper
// =============================================================================

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// =============================================================================
// Validation schemas
// =============================================================================

const industrySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be 100 characters or less").trim(),
});

const specializationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be 100 characters or less").trim(),
  industryId: z.string().uuid("Invalid industry ID"),
});

const updateNameSchema = z.object({
  id: z.string().uuid("Invalid ID"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be 100 characters or less").trim(),
});

// =============================================================================
// Queries
// =============================================================================

export async function getAdminTaxonomy(): Promise<ActionResult<AdminTaxonomyData>> {
  const { supabase, error: authError } = await assertAdmin();
  if (authError || !supabase) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  try {
    // Fetch all industries (including archived) — admin RLS allows this
    const { data: industries, error: indError } = await supabase
      .from("industries")
      .select("*")
      .order("sort_order")
      .order("name");

    if (indError) {
      console.error("[ServerAction:getAdminTaxonomy]", { error: indError.message });
      return { success: false, error: "Failed to fetch industries." };
    }

    // Fetch all specializations (including archived)
    const { data: specializations, error: specError } = await supabase
      .from("specializations")
      .select("*")
      .order("sort_order")
      .order("name");

    if (specError) {
      console.error("[ServerAction:getAdminTaxonomy]", { error: specError.message });
      return { success: false, error: "Failed to fetch specializations." };
    }

    // Count users per industry (via career_entries)
    const { data: industryCounts, error: icError } = await supabase
      .from("career_entries")
      .select("industry_id")
      .not("industry_id", "is", null);

    if (icError) {
      console.error("[ServerAction:getAdminTaxonomy:industryCounts]", { error: icError.message });
    }

    const industryCountMap: Record<string, number> = {};
    for (const row of industryCounts ?? []) {
      const id = row.industry_id as string;
      industryCountMap[id] = (industryCountMap[id] ?? 0) + 1;
    }

    // Count users per specialization (via career_entries)
    const { data: specCounts, error: scError } = await supabase
      .from("career_entries")
      .select("specialization_id")
      .not("specialization_id", "is", null);

    if (scError) {
      console.error("[ServerAction:getAdminTaxonomy:specCounts]", { error: scError.message });
    }

    const specCountMap: Record<string, number> = {};
    for (const row of specCounts ?? []) {
      const id = row.specialization_id as string;
      specCountMap[id] = (specCountMap[id] ?? 0) + 1;
    }

    // Also count users via profiles.primary_industry_id
    const { data: profileCounts, error: pcError } = await supabase
      .from("profiles")
      .select("primary_industry_id")
      .not("primary_industry_id", "is", null);

    if (!pcError) {
      for (const row of profileCounts ?? []) {
        const id = row.primary_industry_id as string;
        industryCountMap[id] = (industryCountMap[id] ?? 0) + 1;
      }
    }

    // Build specialization map by industry
    const specByIndustry: Record<string, AdminSpecializationRow[]> = {};
    for (const spec of specializations ?? []) {
      const s: AdminSpecializationRow = {
        ...(spec as Specialization),
        user_count: specCountMap[spec.id] ?? 0,
      };
      if (!specByIndustry[spec.industry_id]) {
        specByIndustry[spec.industry_id] = [];
      }
      specByIndustry[spec.industry_id].push(s);
    }

    // Build industry rows
    const industryRows: AdminIndustryRow[] = (industries ?? []).map((ind) => ({
      ...(ind as Industry),
      user_count: industryCountMap[ind.id] ?? 0,
      specializations: specByIndustry[ind.id] ?? [],
    }));

    const totalArchivedIndustries = industryRows.filter((i) => i.is_archived).length;
    const totalArchivedSpecializations = (specializations ?? []).filter(
      (s) => s.is_archived
    ).length;

    return {
      success: true,
      data: {
        industries: industryRows,
        totalIndustries: industryRows.length,
        totalSpecializations: (specializations ?? []).length,
        totalArchivedIndustries,
        totalArchivedSpecializations,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:getAdminTaxonomy]", { error: message });
    return { success: false, error: "Something went wrong." };
  }
}

// =============================================================================
// Industry mutations
// =============================================================================

export async function createIndustry(name: string): Promise<ActionResult<Industry>> {
  const { supabase, userId, error: authError } = await assertAdmin();
  if (authError || !supabase || !userId) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  try {
    const parsed = industrySchema.safeParse({ name });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const slug = toSlug(parsed.data.name);

    // Check for duplicate name or slug
    const { data: existing } = await supabase
      .from("industries")
      .select("id, name")
      .or(`slug.eq.${slug},name.ilike.${parsed.data.name}`)
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: false, error: `An industry with a similar name already exists: "${existing[0].name}"` };
    }

    // Get max sort_order
    const { data: maxSort } = await supabase
      .from("industries")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextSort = (maxSort?.[0]?.sort_order ?? 0) + 1;

    const { data, error: insertError } = await supabase
      .from("industries")
      .insert({
        name: parsed.data.name,
        slug,
        sort_order: nextSort,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[ServerAction:createIndustry]", { adminId: userId, error: insertError.message });
      return { success: false, error: "Failed to create industry." };
    }

    await logTaxonomyAction(supabase, userId, "taxonomy_create_industry", {
      industry_id: data.id,
      name: parsed.data.name,
    });

    revalidatePath("/admin/taxonomy");
    return { success: true, data: data as Industry };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:createIndustry]", { adminId: userId, error: message });
    return { success: false, error: "Something went wrong." };
  }
}

export async function updateIndustry(id: string, name: string): Promise<ActionResult> {
  const { supabase, userId, error: authError } = await assertAdmin();
  if (authError || !supabase || !userId) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  try {
    const parsed = updateNameSchema.safeParse({ id, name });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const slug = toSlug(parsed.data.name);

    // Check for duplicate (excluding self)
    const { data: existing } = await supabase
      .from("industries")
      .select("id, name")
      .or(`slug.eq.${slug},name.ilike.${parsed.data.name}`)
      .neq("id", parsed.data.id)
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: false, error: `An industry with a similar name already exists: "${existing[0].name}"` };
    }

    const { error: updateError } = await supabase
      .from("industries")
      .update({ name: parsed.data.name, slug })
      .eq("id", parsed.data.id);

    if (updateError) {
      console.error("[ServerAction:updateIndustry]", { adminId: userId, error: updateError.message });
      return { success: false, error: "Failed to update industry." };
    }

    await logTaxonomyAction(supabase, userId, "taxonomy_update_industry", {
      industry_id: parsed.data.id,
      new_name: parsed.data.name,
    });

    revalidatePath("/admin/taxonomy");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:updateIndustry]", { adminId: userId, error: message });
    return { success: false, error: "Something went wrong." };
  }
}

export async function toggleIndustryArchive(
  id: string,
  archive: boolean
): Promise<ActionResult> {
  const { supabase, userId, error: authError } = await assertAdmin();
  if (authError || !supabase || !userId) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  try {
    if (!z.string().uuid().safeParse(id).success) {
      return { success: false, error: "Invalid industry ID." };
    }

    // Get industry name for audit log
    const { data: industry } = await supabase
      .from("industries")
      .select("name")
      .eq("id", id)
      .single();

    if (!industry) {
      return { success: false, error: "Industry not found." };
    }

    // Archive the industry
    const { error: updateError } = await supabase
      .from("industries")
      .update({ is_archived: archive })
      .eq("id", id);

    if (updateError) {
      console.error("[ServerAction:toggleIndustryArchive]", { adminId: userId, error: updateError.message });
      return { success: false, error: `Failed to ${archive ? "archive" : "restore"} industry.` };
    }

    // If archiving, also archive all child specializations
    if (archive) {
      const { error: childError } = await supabase
        .from("specializations")
        .update({ is_archived: true })
        .eq("industry_id", id);

      if (childError) {
        console.error("[ServerAction:toggleIndustryArchive:children]", { adminId: userId, error: childError.message });
      }
    }

    await logTaxonomyAction(
      supabase,
      userId,
      archive ? "taxonomy_archive_industry" : "taxonomy_restore_industry",
      { industry_id: id, name: industry.name }
    );

    revalidatePath("/admin/taxonomy");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:toggleIndustryArchive]", { adminId: userId, error: message });
    return { success: false, error: "Something went wrong." };
  }
}

// =============================================================================
// Specialization mutations
// =============================================================================

export async function createSpecialization(
  industryId: string,
  name: string
): Promise<ActionResult<Specialization>> {
  const { supabase, userId, error: authError } = await assertAdmin();
  if (authError || !supabase || !userId) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  try {
    const parsed = specializationSchema.safeParse({ name, industryId });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const slug = toSlug(parsed.data.name);

    // Check for duplicate within same industry
    const { data: existing } = await supabase
      .from("specializations")
      .select("id, name")
      .eq("industry_id", parsed.data.industryId)
      .or(`slug.eq.${slug},name.ilike.${parsed.data.name}`)
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: false, error: `A specialization with a similar name already exists: "${existing[0].name}"` };
    }

    // Get max sort_order within industry
    const { data: maxSort } = await supabase
      .from("specializations")
      .select("sort_order")
      .eq("industry_id", parsed.data.industryId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextSort = (maxSort?.[0]?.sort_order ?? 0) + 1;

    const { data, error: insertError } = await supabase
      .from("specializations")
      .insert({
        industry_id: parsed.data.industryId,
        name: parsed.data.name,
        slug,
        sort_order: nextSort,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[ServerAction:createSpecialization]", { adminId: userId, error: insertError.message });
      return { success: false, error: "Failed to create specialization." };
    }

    await logTaxonomyAction(supabase, userId, "taxonomy_create_specialization", {
      specialization_id: data.id,
      industry_id: parsed.data.industryId,
      name: parsed.data.name,
    });

    revalidatePath("/admin/taxonomy");
    return { success: true, data: data as Specialization };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:createSpecialization]", { adminId: userId, error: message });
    return { success: false, error: "Something went wrong." };
  }
}

export async function updateSpecialization(id: string, name: string): Promise<ActionResult> {
  const { supabase, userId, error: authError } = await assertAdmin();
  if (authError || !supabase || !userId) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  try {
    const parsed = updateNameSchema.safeParse({ id, name });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const slug = toSlug(parsed.data.name);

    // Get the specialization's industry_id for uniqueness check
    const { data: spec } = await supabase
      .from("specializations")
      .select("industry_id")
      .eq("id", parsed.data.id)
      .single();

    if (!spec) {
      return { success: false, error: "Specialization not found." };
    }

    // Check for duplicate within same industry (excluding self)
    const { data: existing } = await supabase
      .from("specializations")
      .select("id, name")
      .eq("industry_id", spec.industry_id)
      .or(`slug.eq.${slug},name.ilike.${parsed.data.name}`)
      .neq("id", parsed.data.id)
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: false, error: `A specialization with a similar name already exists: "${existing[0].name}"` };
    }

    const { error: updateError } = await supabase
      .from("specializations")
      .update({ name: parsed.data.name, slug })
      .eq("id", parsed.data.id);

    if (updateError) {
      console.error("[ServerAction:updateSpecialization]", { adminId: userId, error: updateError.message });
      return { success: false, error: "Failed to update specialization." };
    }

    await logTaxonomyAction(supabase, userId, "taxonomy_update_specialization", {
      specialization_id: parsed.data.id,
      new_name: parsed.data.name,
    });

    revalidatePath("/admin/taxonomy");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:updateSpecialization]", { adminId: userId, error: message });
    return { success: false, error: "Something went wrong." };
  }
}

export async function toggleSpecializationArchive(
  id: string,
  archive: boolean
): Promise<ActionResult> {
  const { supabase, userId, error: authError } = await assertAdmin();
  if (authError || !supabase || !userId) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  try {
    if (!z.string().uuid().safeParse(id).success) {
      return { success: false, error: "Invalid specialization ID." };
    }

    const { data: spec } = await supabase
      .from("specializations")
      .select("name")
      .eq("id", id)
      .single();

    if (!spec) {
      return { success: false, error: "Specialization not found." };
    }

    const { error: updateError } = await supabase
      .from("specializations")
      .update({ is_archived: archive })
      .eq("id", id);

    if (updateError) {
      console.error("[ServerAction:toggleSpecializationArchive]", { adminId: userId, error: updateError.message });
      return { success: false, error: `Failed to ${archive ? "archive" : "restore"} specialization.` };
    }

    await logTaxonomyAction(
      supabase,
      userId,
      archive ? "taxonomy_archive_specialization" : "taxonomy_restore_specialization",
      { specialization_id: id, name: spec.name }
    );

    revalidatePath("/admin/taxonomy");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:toggleSpecializationArchive]", { adminId: userId, error: message });
    return { success: false, error: "Something went wrong." };
  }
}
