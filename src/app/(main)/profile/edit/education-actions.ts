"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { recalculateProfileCompleteness } from "@/lib/profile-completeness-updater";
import type { ActionResult } from "@/lib/types";

const educationEntrySchema = z
  .object({
    institution: z
      .string()
      .min(1, "Institution is required")
      .max(200, "Institution must be under 200 characters"),
    degree: z.string().max(100, "Degree must be under 100 characters").optional(),
    field_of_study: z
      .string()
      .max(200, "Field of study must be under 200 characters")
      .optional(),
    start_year: z.coerce
      .number()
      .int()
      .min(1950, "Year must be 1950 or later")
      .max(2100, "Year must be 2100 or earlier")
      .optional(),
    end_year: z.coerce
      .number()
      .int()
      .min(1950, "Year must be 1950 or later")
      .max(2100, "Year must be 2100 or earlier")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.start_year && data.end_year) {
        return data.end_year >= data.start_year;
      }
      return true;
    },
    { message: "End year must be on or after start year", path: ["end_year"] }
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

export async function addEducationEntry(
  _prevState: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const raw = {
    institution: formData.get("institution"),
    degree: formData.get("degree") || undefined,
    field_of_study: formData.get("field_of_study") || undefined,
    start_year: formData.get("start_year") || undefined,
    end_year: formData.get("end_year") || undefined,
  };

  const parsed = educationEntrySchema.safeParse(raw);
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

  try {
    const { data, error } = await supabase
      .from("education_entries")
      .insert({
        profile_id: auth.profileId,
        institution: parsed.data.institution,
        degree: parsed.data.degree ?? null,
        field_of_study: parsed.data.field_of_study ?? null,
        start_year: parsed.data.start_year ?? null,
        end_year: parsed.data.end_year ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[ServerAction:addEducationEntry]", {
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
    console.error("[ServerAction:addEducationEntry]", {
      userId: auth.userId,
      error: message,
    });
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function updateEducationEntry(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const entryId = formData.get("entry_id") as string;
  if (!entryId) {
    return { success: false, error: "Missing entry ID." };
  }

  const raw = {
    institution: formData.get("institution"),
    degree: formData.get("degree") || undefined,
    field_of_study: formData.get("field_of_study") || undefined,
    start_year: formData.get("start_year") || undefined,
    end_year: formData.get("end_year") || undefined,
  };

  const parsed = educationEntrySchema.safeParse(raw);
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

  try {
    const { error } = await supabase
      .from("education_entries")
      .update({
        institution: parsed.data.institution,
        degree: parsed.data.degree ?? null,
        field_of_study: parsed.data.field_of_study ?? null,
        start_year: parsed.data.start_year ?? null,
        end_year: parsed.data.end_year ?? null,
      })
      .eq("id", entryId)
      .eq("profile_id", auth.profileId);

    if (error) {
      console.error("[ServerAction:updateEducationEntry]", {
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
    console.error("[ServerAction:updateEducationEntry]", {
      userId: auth.userId,
      error: message,
    });
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function deleteEducationEntry(
  entryId: string
): Promise<ActionResult> {
  const auth = await getOwnProfileId();
  if (!auth) {
    return { success: false, error: "You must be logged in." };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("education_entries")
      .delete()
      .eq("id", entryId)
      .eq("profile_id", auth.profileId);

    if (error) {
      console.error("[ServerAction:deleteEducationEntry]", {
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
    console.error("[ServerAction:deleteEducationEntry]", {
      userId: auth.userId,
      error: message,
    });
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
