"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { recalculateProfileCompleteness } from "@/lib/profile-completeness-updater";
import type { ActionResult } from "@/lib/types";

const careerEntrySchema = z
  .object({
    job_title: z
      .string()
      .min(1, "Job title is required")
      .max(200, "Job title must be under 200 characters"),
    company: z
      .string()
      .min(1, "Company is required")
      .max(200, "Company must be under 200 characters"),
    industry_id: z.uuid("Invalid industry").optional(),
    specialization_id: z.uuid("Invalid specialization").optional(),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().optional(),
    description: z
      .string()
      .max(500, "Description must be under 500 characters")
      .optional(),
    is_current: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.end_date && data.start_date) {
        return data.end_date >= data.start_date;
      }
      return true;
    },
    { message: "End date must be on or after start date", path: ["end_date"] }
  );

async function getOwnProfileId(): Promise<{
  profileId: string;
  userId: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) return null;
  return { profileId: profile.id, userId: user.id };
}

export async function addCareerEntry(
  _prevState: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const raw = {
    job_title: formData.get("job_title"),
    company: formData.get("company"),
    industry_id: formData.get("industry_id") || undefined,
    specialization_id: formData.get("specialization_id") || undefined,
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date") || undefined,
    description: formData.get("description") || undefined,
    is_current: formData.get("is_current") === "on",
  };

  const parsed = careerEntrySchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return { success: false, error: "Please fix the errors below.", fieldErrors };
  }

  const auth = await getOwnProfileId();
  if (!auth) {
    return { success: false, error: "You must be logged in." };
  }

  const supabase = await createClient();

  // If marking as current, unset other current entries
  if (parsed.data.is_current) {
    await supabase
      .from("career_entries")
      .update({ is_current: false })
      .eq("profile_id", auth.profileId)
      .eq("is_current", true);
  }

  try {
    const { data, error } = await supabase
      .from("career_entries")
      .insert({
        profile_id: auth.profileId,
        job_title: parsed.data.job_title,
        company: parsed.data.company,
        industry_id: parsed.data.industry_id ?? null,
        specialization_id: parsed.data.specialization_id ?? null,
        start_date: parsed.data.start_date,
        end_date: parsed.data.end_date ?? null,
        description: parsed.data.description ?? null,
        is_current: parsed.data.is_current ?? false,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[ServerAction:addCareerEntry]", {
        userId: auth.userId,
        error: error.message,
      });
      return { success: false, error: "Something went wrong. Please try again." };
    }

    await recalculateProfileCompleteness(auth.profileId);
    revalidatePath("/profile/edit");
    revalidatePath(`/profile/${auth.profileId}`);

    return { success: true, data: { id: data.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:addCareerEntry]", {
      userId: auth.userId,
      error: message,
    });
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function updateCareerEntry(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const entryId = formData.get("entry_id") as string;
  if (!entryId) {
    return { success: false, error: "Missing entry ID." };
  }

  const raw = {
    job_title: formData.get("job_title"),
    company: formData.get("company"),
    industry_id: formData.get("industry_id") || undefined,
    specialization_id: formData.get("specialization_id") || undefined,
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date") || undefined,
    description: formData.get("description") || undefined,
    is_current: formData.get("is_current") === "on",
  };

  const parsed = careerEntrySchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return { success: false, error: "Please fix the errors below.", fieldErrors };
  }

  const auth = await getOwnProfileId();
  if (!auth) {
    return { success: false, error: "You must be logged in." };
  }

  const supabase = await createClient();

  // If marking as current, unset other current entries
  if (parsed.data.is_current) {
    await supabase
      .from("career_entries")
      .update({ is_current: false })
      .eq("profile_id", auth.profileId)
      .eq("is_current", true)
      .neq("id", entryId);
  }

  try {
    const { error } = await supabase
      .from("career_entries")
      .update({
        job_title: parsed.data.job_title,
        company: parsed.data.company,
        industry_id: parsed.data.industry_id ?? null,
        specialization_id: parsed.data.specialization_id ?? null,
        start_date: parsed.data.start_date,
        end_date: parsed.data.end_date ?? null,
        description: parsed.data.description ?? null,
        is_current: parsed.data.is_current ?? false,
      })
      .eq("id", entryId)
      .eq("profile_id", auth.profileId);

    if (error) {
      console.error("[ServerAction:updateCareerEntry]", {
        userId: auth.userId,
        error: error.message,
      });
      return { success: false, error: "Something went wrong. Please try again." };
    }

    revalidatePath("/profile/edit");
    revalidatePath(`/profile/${auth.profileId}`);

    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:updateCareerEntry]", {
      userId: auth.userId,
      error: message,
    });
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function deleteCareerEntry(
  entryId: string
): Promise<ActionResult> {
  const auth = await getOwnProfileId();
  if (!auth) {
    return { success: false, error: "You must be logged in." };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("career_entries")
      .delete()
      .eq("id", entryId)
      .eq("profile_id", auth.profileId);

    if (error) {
      console.error("[ServerAction:deleteCareerEntry]", {
        userId: auth.userId,
        error: error.message,
      });
      return { success: false, error: "Something went wrong. Please try again." };
    }

    await recalculateProfileCompleteness(auth.profileId);
    revalidatePath("/profile/edit");
    revalidatePath(`/profile/${auth.profileId}`);

    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:deleteCareerEntry]", {
      userId: auth.userId,
      error: message,
    });
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
