"use server";

import { redirect } from "next/navigation";
import { z } from "zod/v4";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { calculateProfileCompleteness } from "@/lib/profile-completeness";
import { geocodeLocation } from "@/lib/geocoding";
import type { ActionResult } from "@/lib/types";

const quizSchema = z.object({
  country: z.string().max(100).optional(),
  state_province: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  bio: z.string().max(500, "Bio must be under 500 characters").optional(),
  job_title: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  availability_tag_ids: z.array(z.uuid()).optional(),
});

export async function completeOnboardingQuiz(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  // Get existing profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, graduation_year, primary_industry_id, primary_specialization_id, photo_url, secondary_industry_id, secondary_specialization_id")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    redirect("/onboarding");
  }

  const raw = {
    country: formData.get("country") || undefined,
    state_province: formData.get("state_province") || undefined,
    city: formData.get("city") || undefined,
    bio: formData.get("bio") || undefined,
    job_title: formData.get("job_title") || undefined,
    company: formData.get("company") || undefined,
    availability_tag_ids: formData.getAll("availability_tag_ids").filter(Boolean) as string[],
  };

  const parsed = quizSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return { success: false, error: "Please fix the errors below.", fieldErrors };
  }

  const { country, state_province, city, bio, job_title, company, availability_tag_ids } = parsed.data;

  try {
    // Update profile with location and bio
    const hasLocationOrBio = country || state_province || city || bio;
    if (hasLocationOrBio) {
      const updateData: Record<string, string | number | null> = {};
      if (country) updateData.country = country;
      if (state_province) updateData.state_province = state_province;
      if (city) updateData.city = city;
      if (bio) updateData.bio = bio;

      // Recalculate completeness
      updateData.profile_completeness = calculateProfileCompleteness({
        full_name: profile.full_name,
        graduation_year: profile.graduation_year,
        primary_industry_id: profile.primary_industry_id,
        primary_specialization_id: profile.primary_specialization_id,
        photo_url: profile.photo_url,
        bio: bio ?? null,
        country: country ?? null,
        state_province: state_province ?? null,
        city: city ?? null,
        secondary_industry_id: profile.secondary_industry_id,
        secondary_specialization_id: profile.secondary_specialization_id,
        has_career_entries: !!(job_title && company),
        has_availability_tags: !!(availability_tag_ids && availability_tag_ids.length > 0),
      });

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", profile.id);

      if (updateError) {
        console.error("[ServerAction:completeOnboardingQuiz]", {
          userId: user.id,
          error: updateError.message,
        });
        return { success: false, error: "Failed to update profile. Please try again." };
      }

      // Fire-and-forget: geocode location for map feature
      if (country || city) {
        geocodeLocation(city ?? null, state_province ?? null, country ?? null)
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
                .eq("id", profile.id);
            }
          })
          .catch((err) => {
            console.error("[ServerAction:completeOnboardingQuiz:geocoding]", {
              profileId: profile.id,
              error: err instanceof Error ? err.message : "Unknown error",
            });
          });
      }
    }

    // Insert career entry if job title and company provided
    if (job_title && company) {
      const { error: careerError } = await supabase
        .from("career_entries")
        .insert({
          profile_id: profile.id,
          job_title,
          company,
          is_current: true,
          start_date: new Date().toISOString().split("T")[0],
        });

      if (careerError) {
        console.error("[ServerAction:completeOnboardingQuiz:career]", {
          userId: user.id,
          error: careerError.message,
        });
        // Non-blocking — continue even if career entry fails
      }
    }

    // Insert availability tags
    if (availability_tag_ids && availability_tag_ids.length > 0) {
      const tagRows = availability_tag_ids.map((tagId) => ({
        profile_id: profile.id,
        tag_type_id: tagId,
      }));

      const { error: tagsError } = await supabase
        .from("user_availability_tags")
        .insert(tagRows);

      if (tagsError) {
        console.error("[ServerAction:completeOnboardingQuiz:tags]", {
          userId: user.id,
          error: tagsError.message,
        });
        // Non-blocking
      }
    }

    // If we didn't update profile yet but have career/tags, recalculate completeness
    if (!hasLocationOrBio && (job_title || (availability_tag_ids && availability_tag_ids.length > 0))) {
      const completeness = calculateProfileCompleteness({
        full_name: profile.full_name,
        graduation_year: profile.graduation_year,
        primary_industry_id: profile.primary_industry_id,
        primary_specialization_id: profile.primary_specialization_id,
        photo_url: profile.photo_url,
        bio: null,
        country: null,
        state_province: null,
        city: null,
        secondary_industry_id: profile.secondary_industry_id,
        secondary_specialization_id: profile.secondary_specialization_id,
        has_career_entries: !!(job_title && company),
        has_availability_tags: !!(availability_tag_ids && availability_tag_ids.length > 0),
      });

      await supabase
        .from("profiles")
        .update({ profile_completeness: completeness })
        .eq("id", profile.id);
    }

    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      throw err;
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:completeOnboardingQuiz]", {
      userId: user.id,
      error: message,
    });
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
