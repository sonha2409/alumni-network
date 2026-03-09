"use server";

import { z } from "zod/v4";

import { createClient } from "@/lib/supabase/server";
import { getSchool } from "@/lib/school";
import type { ActionResult } from "@/lib/types";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB per file
const MAX_FILES = 4;
const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

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

  // Validate uploaded files
  const files = formData.getAll("documents") as File[];
  const validFiles = files.filter((f) => f.size > 0);

  if (validFiles.length > MAX_FILES) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { documents: [`You can upload up to ${MAX_FILES} files.`] },
    };
  }

  for (const file of validFiles) {
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: {
          documents: [`"${file.name}" is not a supported file type. Use PDF, JPEG, PNG, or WebP.`],
        },
      };
    }
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: {
          documents: [`"${file.name}" is too large. Maximum file size is 2 MB.`],
        },
      };
    }
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
    const { data: insertedRequest, error: insertError } = await supabase
      .from("verification_requests")
      .insert({
        user_id: user.id,
        graduation_year: parsed.data.graduation_year,
        student_id: parsed.data.student_id ?? null,
        specialization_name: parsed.data.specialization_name,
        school_id: school.id,
        supporting_info: parsed.data.supporting_info ?? null,
      })
      .select("id")
      .single();

    if (insertError || !insertedRequest) {
      console.error("[ServerAction:submitVerificationRequest]", {
        userId: user.id,
        error: insertError?.message ?? "Insert returned no data",
      });
      return { success: false, error: "Something went wrong. Please try again." };
    }

    // Upload documents to storage and insert metadata rows
    const uploadedPaths: string[] = [];

    for (const file of validFiles) {
      const ext = file.name.split(".").pop() ?? "bin";
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${user.id}/${insertedRequest.id}/${Date.now()}_${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from("verification-documents")
        .upload(filePath, file, { contentType: file.type });

      if (uploadError) {
        console.error("[ServerAction:submitVerificationRequest]", {
          userId: user.id,
          fileName: file.name,
          error: uploadError.message,
        });
        // Clean up already-uploaded files on failure
        if (uploadedPaths.length > 0) {
          await supabase.storage
            .from("verification-documents")
            .remove(uploadedPaths);
        }
        return { success: false, error: `Failed to upload "${file.name}". Please try again.` };
      }

      uploadedPaths.push(filePath);

      const { error: docInsertError } = await supabase
        .from("verification_documents")
        .insert({
          request_id: insertedRequest.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          content_type: file.type,
        });

      if (docInsertError) {
        console.error("[ServerAction:submitVerificationRequest]", {
          userId: user.id,
          fileName: file.name,
          error: docInsertError.message,
        });
        // Non-fatal: file is in storage but metadata row failed.
        // Admin can still see the file via storage, and the request itself is valid.
      }
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
