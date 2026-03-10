"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { recalculateProfileCompleteness } from "@/lib/profile-completeness-updater";
import type { ActionResult } from "@/lib/types";

const contactDetailsSchema = z.object({
  personal_email: z
    .string()
    .max(255, "Email must be under 255 characters")
    .email("Invalid email address")
    .or(z.literal(""))
    .transform((v) => v || null),
  phone: z
    .string()
    .max(30, "Phone number must be under 30 characters")
    .or(z.literal(""))
    .transform((v) => v || null),
  linkedin_url: z
    .string()
    .max(500, "URL must be under 500 characters")
    .url("Invalid URL")
    .or(z.literal(""))
    .transform((v) => v || null),
  github_url: z
    .string()
    .max(500, "URL must be under 500 characters")
    .url("Invalid URL")
    .or(z.literal(""))
    .transform((v) => v || null),
  website_url: z
    .string()
    .max(500, "URL must be under 500 characters")
    .url("Invalid URL")
    .or(z.literal(""))
    .transform((v) => v || null),
});

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

export async function upsertContactDetails(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const own = await getOwnProfileId();
  if (!own) {
    return { success: false, error: "You must be logged in." };
  }

  const raw = {
    personal_email: formData.get("personal_email") as string ?? "",
    phone: formData.get("phone") as string ?? "",
    linkedin_url: formData.get("linkedin_url") as string ?? "",
    github_url: formData.get("github_url") as string ?? "",
    website_url: formData.get("website_url") as string ?? "",
  };

  const result = contactDetailsSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors,
    };
  }

  const data = result.data;
  const hasAnyDetail = !!(
    data.personal_email ||
    data.phone ||
    data.linkedin_url ||
    data.github_url ||
    data.website_url
  );

  const supabase = await createClient();

  try {
    // Upsert contact details
    const { error } = await supabase
      .from("profile_contact_details")
      .upsert(
        {
          profile_id: own.profileId,
          ...data,
        },
        { onConflict: "profile_id" }
      );

    if (error) throw error;

    // Update has_contact_details flag on profiles
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ has_contact_details: hasAnyDetail })
      .eq("id", own.profileId);

    if (profileError) throw profileError;

    await recalculateProfileCompleteness(own.profileId);

    revalidatePath(`/profile/${own.profileId}`);
    revalidatePath("/profile/edit");

    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:upsertContactDetails]", {
      userId: own.userId,
      error: message,
    });
    return { success: false, error: "Failed to save contact details." };
  }
}

export async function deleteContactDetails(
  _prevState: ActionResult | null
): Promise<ActionResult> {
  const own = await getOwnProfileId();
  if (!own) {
    return { success: false, error: "You must be logged in." };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("profile_contact_details")
      .delete()
      .eq("profile_id", own.profileId);

    if (error) throw error;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ has_contact_details: false })
      .eq("id", own.profileId);

    if (profileError) throw profileError;

    await recalculateProfileCompleteness(own.profileId);

    revalidatePath(`/profile/${own.profileId}`);
    revalidatePath("/profile/edit");

    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:deleteContactDetails]", {
      userId: own.userId,
      error: message,
    });
    return { success: false, error: "Failed to delete contact details." };
  }
}
