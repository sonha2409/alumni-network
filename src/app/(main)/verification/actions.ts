"use server";

import { z } from "zod/v4";

import { createClient } from "@/lib/supabase/server";
import { getSchool } from "@/lib/school";
import type { ActionResult } from "@/lib/types";

export async function submitVerificationRequest(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const school = await getSchool();
  const currentYear = new Date().getFullYear();

  const verificationSchema = z.object({
    graduation_year: z.coerce
      .number()
      .int("Graduation year must be a whole number")
      .min(school.first_graduating_year, `Graduation year must be ${school.first_graduating_year} or later`)
      .max(currentYear + 3, `Graduation year must be ${currentYear + 3} or earlier`),
    student_id: z.string().max(50, "Student ID must be under 50 characters").optional(),
    specialization_name: z
      .string()
      .min(2, "Specialization must be at least 2 characters")
      .max(200, "Specialization must be under 200 characters"),
    supporting_info: z
      .string()
      .max(1000, "Supporting info must be under 1000 characters")
      .optional(),
  });

  const raw = {
    graduation_year: formData.get("graduation_year"),
    student_id: formData.get("student_id") || undefined,
    specialization_name: formData.get("specialization_name"),
    supporting_info: formData.get("supporting_info") || undefined,
  };

  const parsed = verificationSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return { success: false, error: "Please fix the errors below.", fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  // Check current verification status — block if already pending or verified
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("verification_status")
    .eq("id", user.id)
    .single();

  if (userError || !userData) {
    console.error("[ServerAction:submitVerificationRequest]", {
      userId: user.id,
      error: userError?.message ?? "User not found",
    });
    return { success: false, error: "Something went wrong. Please try again." };
  }

  if (userData.verification_status === "pending") {
    return { success: false, error: "You already have a verification request under review." };
  }

  if (userData.verification_status === "verified") {
    return { success: false, error: "Your account is already verified." };
  }

  try {
    // Insert verification request
    const { error: insertError } = await supabase
      .from("verification_requests")
      .insert({
        user_id: user.id,
        graduation_year: parsed.data.graduation_year,
        student_id: parsed.data.student_id ?? null,
        specialization_name: parsed.data.specialization_name,
        school_id: school.id,
        supporting_info: parsed.data.supporting_info ?? null,
      });

    if (insertError) {
      console.error("[ServerAction:submitVerificationRequest]", {
        userId: user.id,
        error: insertError.message,
      });
      return { success: false, error: "Something went wrong. Please try again." };
    }

    // Update user verification_status to pending
    const { error: updateError } = await supabase
      .from("users")
      .update({ verification_status: "pending" })
      .eq("id", user.id);

    if (updateError) {
      console.error("[ServerAction:submitVerificationRequest]", {
        userId: user.id,
        error: updateError.message,
      });
      // Request was inserted but status didn't update — not ideal but not fatal
    }

    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:submitVerificationRequest]", {
      userId: user.id,
      error: message,
    });
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
