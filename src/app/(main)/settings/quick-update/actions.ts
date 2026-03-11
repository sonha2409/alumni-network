"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { recalculateProfileCompleteness } from "@/lib/profile-completeness-updater";
import type { ActionResult } from "@/lib/types";

const quickUpdateSchema = z.object({
  profile_id: z.string().uuid(),
  career_entry_id: z.string().uuid().optional(),
  job_title: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  country: z.string().max(100).optional(),
  state_province: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  tag_type_ids: z.array(z.string().uuid()).optional(),
  no_changes: z.string().optional(),
});

export async function quickUpdateProfile(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated." };

  const raw = {
    profile_id: formData.get("profile_id") as string,
    career_entry_id: (formData.get("career_entry_id") as string) || undefined,
    job_title: (formData.get("job_title") as string) || undefined,
    company: (formData.get("company") as string) || undefined,
    country: (formData.get("country") as string) || undefined,
    state_province: (formData.get("state_province") as string) || undefined,
    city: (formData.get("city") as string) || undefined,
    tag_type_ids: formData.getAll("tag_type_ids").map(String).filter(Boolean),
    no_changes: (formData.get("no_changes") as string) || undefined,
  };

  const parsed = quickUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Invalid input." };
  }

  const { profile_id, no_changes } = parsed.data;

  // Verify ownership
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", profile_id)
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return { success: false, error: "Profile not found." };
  }

  try {
    const now = new Date().toISOString();

    if (no_changes) {
      // Just touch updated_at to reset staleness clock
      await supabase
        .from("profiles")
        .update({
          updated_at: now,
          last_profile_update_at: now,
          staleness_nudge_snoozed_at: null,
        })
        .eq("id", profile_id);

      revalidatePath("/", "layout");
      return { success: true, data: undefined };
    }

    // Update profile location
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        country: parsed.data.country || null,
        state_province: parsed.data.state_province || null,
        city: parsed.data.city || null,
        updated_at: now,
        last_profile_update_at: now,
        staleness_nudge_snoozed_at: null,
      })
      .eq("id", profile_id);

    if (profileError) {
      console.error("[ServerAction:quickUpdateProfile]", {
        userId: user.id,
        error: profileError.message,
      });
      return { success: false, error: "Failed to update profile." };
    }

    // Update current career entry if provided
    if (parsed.data.career_entry_id && (parsed.data.job_title || parsed.data.company)) {
      const careerUpdate: Record<string, string> = {};
      if (parsed.data.job_title) careerUpdate.job_title = parsed.data.job_title;
      if (parsed.data.company) careerUpdate.company = parsed.data.company;

      const { error: careerError } = await supabase
        .from("career_entries")
        .update(careerUpdate)
        .eq("id", parsed.data.career_entry_id)
        .eq("profile_id", profile_id);

      if (careerError) {
        console.error("[ServerAction:quickUpdateProfile:career]", {
          userId: user.id,
          error: careerError.message,
        });
        // Non-fatal — profile was already updated
      }
    }

    // Update availability tags
    if (parsed.data.tag_type_ids) {
      // Delete existing
      await supabase
        .from("user_availability_tags")
        .delete()
        .eq("profile_id", profile_id);

      // Insert new
      if (parsed.data.tag_type_ids.length > 0) {
        const rows = parsed.data.tag_type_ids.map((tagTypeId) => ({
          profile_id,
          tag_type_id: tagTypeId,
        }));

        const { error: tagError } = await supabase
          .from("user_availability_tags")
          .insert(rows);

        if (tagError) {
          console.error("[ServerAction:quickUpdateProfile:tags]", {
            userId: user.id,
            error: tagError.message,
          });
          // Non-fatal
        }
      }
    }

    await recalculateProfileCompleteness(profile_id);
    revalidatePath("/", "layout");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:quickUpdateProfile]", {
      userId: user.id,
      error: message,
    });
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
