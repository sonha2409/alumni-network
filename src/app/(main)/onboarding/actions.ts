"use server";

import { redirect } from "next/navigation";
import { z } from "zod/v4";

import { createClient } from "@/lib/supabase/server";
import { calculateProfileCompleteness } from "@/lib/profile-completeness";
import { getSchool } from "@/lib/school";
import type { ActionResult } from "@/lib/types";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function createProfile(
  _prevState: ActionResult<{ profileId: string }> | null,
  formData: FormData
): Promise<ActionResult<{ profileId: string }>> {
  const school = await getSchool();
  const currentYear = new Date().getFullYear();

  const createProfileSchema = z.object({
    full_name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be under 100 characters"),
    graduation_year: z.coerce
      .number()
      .int("Graduation year must be a whole number")
      .min(school.first_graduating_year, `Graduation year must be ${school.first_graduating_year} or later`)
      .max(currentYear + 3, `Graduation year must be ${currentYear + 3} or earlier`),
    primary_industry_id: z.uuid("Please select an industry"),
    primary_specialization_id: z.uuid("Invalid specialization").optional(),
  });

  const raw = {
    full_name: formData.get("full_name"),
    graduation_year: formData.get("graduation_year"),
    primary_industry_id: formData.get("primary_industry_id"),
    primary_specialization_id:
      formData.get("primary_specialization_id") || undefined,
  };

  const parsed = createProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  // Check if profile already exists
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (count && count > 0) {
    redirect("/dashboard");
  }

  // Validate specialization belongs to selected industry
  if (parsed.data.primary_specialization_id) {
    const { data: spec } = await supabase
      .from("specializations")
      .select("industry_id")
      .eq("id", parsed.data.primary_specialization_id)
      .single();

    if (!spec || spec.industry_id !== parsed.data.primary_industry_id) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: {
          primary_specialization_id: [
            "Specialization does not belong to the selected industry.",
          ],
        },
      };
    }
  }

  // Handle optional photo upload
  let photoUrl: string | null = null;
  const photoFile = formData.get("photo") as File | null;

  if (photoFile && photoFile.size > 0) {
    if (!ACCEPTED_IMAGE_TYPES.includes(photoFile.type)) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: {
          photo: ["Photo must be JPEG, PNG, or WebP."],
        },
      };
    }
    if (photoFile.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: {
          photo: ["Photo must be under 5 MB."],
        },
      };
    }

    const ext = photoFile.name.split(".").pop() ?? "jpg";
    const filePath = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, photoFile, { contentType: photoFile.type });

    if (uploadError) {
      console.error("[ServerAction:createProfile]", {
        userId: user.id,
        error: uploadError.message,
      });
      // Continue without photo — don't block profile creation
    } else {
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);
      photoUrl = publicUrl;
    }
  }

  const profileData = {
    user_id: user.id,
    full_name: parsed.data.full_name,
    graduation_year: parsed.data.graduation_year,
    primary_industry_id: parsed.data.primary_industry_id,
    primary_specialization_id:
      parsed.data.primary_specialization_id ?? null,
    school_id: school.id,
    photo_url: photoUrl,
    profile_completeness: calculateProfileCompleteness({
      full_name: parsed.data.full_name,
      graduation_year: parsed.data.graduation_year,
      primary_industry_id: parsed.data.primary_industry_id,
      primary_specialization_id:
        parsed.data.primary_specialization_id ?? null,
      photo_url: photoUrl,
      bio: null,
      country: null,
      state_province: null,
      city: null,
      secondary_industry_id: null,
      secondary_specialization_id: null,
    }),
  };

  try {
    const { data, error } = await supabase
      .from("profiles")
      .insert(profileData)
      .select("id")
      .single();

    if (error) {
      console.error("[ServerAction:createProfile]", {
        userId: user.id,
        error: error.message,
      });

      if (error.code === "23505") {
        redirect("/dashboard");
      }

      return { success: false, error: "Something went wrong. Please try again." };
    }

    return { success: true, data: { profileId: data.id } };
  } catch (err) {
    // Re-throw redirect errors (Next.js throws these as errors)
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      throw err;
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:createProfile]", {
      userId: user.id,
      error: message,
    });
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
