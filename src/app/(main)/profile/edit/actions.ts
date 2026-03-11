"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { recalculateProfileCompleteness } from "@/lib/profile-completeness-updater";
import { getSchool } from "@/lib/school";
import { geocodeLocation, hasLocationChanged } from "@/lib/geocoding";
import type { ActionResult } from "@/lib/types";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function updateProfile(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const school = await getSchool();
  const currentYear = new Date().getFullYear();

  const updateProfileSchema = z.object({
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
    secondary_industry_id: z.uuid("Invalid industry").optional(),
    secondary_specialization_id: z.uuid("Invalid specialization").optional(),
    bio: z.string().max(1000, "Bio must be under 1000 characters").optional(),
    country: z.string().max(100).optional(),
    state_province: z.string().max(100).optional(),
    city: z.string().max(100).optional(),
  });

  const raw = {
    full_name: formData.get("full_name"),
    graduation_year: formData.get("graduation_year"),
    primary_industry_id: formData.get("primary_industry_id"),
    primary_specialization_id:
      formData.get("primary_specialization_id") || undefined,
    secondary_industry_id:
      formData.get("secondary_industry_id") || undefined,
    secondary_specialization_id:
      formData.get("secondary_specialization_id") || undefined,
    bio: formData.get("bio") || undefined,
    country: formData.get("country") || undefined,
    state_province: formData.get("state_province") || undefined,
    city: formData.get("city") || undefined,
  };

  const parsed = updateProfileSchema.safeParse(raw);
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

  // Fetch existing profile
  const { data: existingProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("id, photo_url, country, state_province, city")
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existingProfile) {
    return { success: false, error: "Profile not found." };
  }

  // Validate specialization → industry pairings
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
            "Specialization does not match the selected industry.",
          ],
        },
      };
    }
  }

  if (parsed.data.secondary_specialization_id) {
    if (!parsed.data.secondary_industry_id) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: {
          secondary_industry_id: [
            "Select a secondary industry before choosing a specialization.",
          ],
        },
      };
    }

    const { data: spec } = await supabase
      .from("specializations")
      .select("industry_id")
      .eq("id", parsed.data.secondary_specialization_id)
      .single();

    if (!spec || spec.industry_id !== parsed.data.secondary_industry_id) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: {
          secondary_specialization_id: [
            "Specialization does not match the selected industry.",
          ],
        },
      };
    }
  }

  // Handle photo upload
  let photoUrl: string | null = existingProfile.photo_url;
  const photoFile = formData.get("photo") as File | null;

  if (photoFile && photoFile.size > 0) {
    if (!ACCEPTED_IMAGE_TYPES.includes(photoFile.type)) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { photo: ["Photo must be JPEG, PNG, or WebP."] },
      };
    }
    if (photoFile.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { photo: ["Photo must be under 5 MB."] },
      };
    }

    // Delete old avatar if exists
    if (existingProfile.photo_url) {
      const oldPath = extractAvatarPath(existingProfile.photo_url);
      if (oldPath) {
        await supabase.storage.from("avatars").remove([oldPath]);
      }
    }

    const ext = photoFile.name.split(".").pop() ?? "jpg";
    const filePath = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, photoFile, { contentType: photoFile.type });

    if (uploadError) {
      console.error("[ServerAction:updateProfile]", {
        userId: user.id,
        error: uploadError.message,
      });
      // Don't fail the whole update for a photo error
    } else {
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);
      photoUrl = publicUrl;
    }
  }

  const updateData = {
    full_name: parsed.data.full_name,
    graduation_year: parsed.data.graduation_year,
    primary_industry_id: parsed.data.primary_industry_id,
    primary_specialization_id:
      parsed.data.primary_specialization_id ?? null,
    secondary_industry_id:
      parsed.data.secondary_industry_id ?? null,
    secondary_specialization_id:
      parsed.data.secondary_specialization_id ?? null,
    bio: parsed.data.bio ?? null,
    country: parsed.data.country ?? null,
    state_province: parsed.data.state_province ?? null,
    city: parsed.data.city ?? null,
    photo_url: photoUrl,
    last_profile_update_at: new Date().toISOString(),
    // profile_completeness is recalculated below after we check related entries
  };

  try {
    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", existingProfile.id);

    if (error) {
      console.error("[ServerAction:updateProfile]", {
        userId: user.id,
        error: error.message,
      });
      return {
        success: false,
        error: "Something went wrong. Please try again.",
      };
    }

    await recalculateProfileCompleteness(existingProfile.id);
    revalidatePath("/profile/edit");
    revalidatePath(`/profile/${existingProfile.id}`);

    // Fire-and-forget: geocode location if it changed
    const oldLocation = {
      country: existingProfile.country ?? null,
      state_province: existingProfile.state_province ?? null,
      city: existingProfile.city ?? null,
    };
    const newLocation = {
      country: updateData.country,
      state_province: updateData.state_province,
      city: updateData.city,
    };

    if (hasLocationChanged(oldLocation, newLocation)) {
      geocodeLocation(
        newLocation.city,
        newLocation.state_province,
        newLocation.country
      )
        .then(async (coords) => {
          if (coords) {
            const serviceClient = createServiceClient();
            await serviceClient
              .from("profiles")
              .update({
                latitude: coords.latitude,
                longitude: coords.longitude,
                location_geocoded_at: new Date().toISOString(),
              })
              .eq("id", existingProfile.id);
          }
        })
        .catch((err) => {
          console.error("[ServerAction:updateProfile:geocoding]", {
            profileId: existingProfile.id,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        });
    }

    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:updateProfile]", {
      userId: user.id,
      error: message,
    });
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}

/**
 * Extract the storage path from a public avatar URL.
 * URL format: .../storage/v1/object/public/avatars/{userId}/{filename}
 */
function extractAvatarPath(publicUrl: string): string | null {
  const marker = "/storage/v1/object/public/avatars/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}
