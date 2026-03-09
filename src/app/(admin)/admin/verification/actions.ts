"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

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

export async function approveRequest(requestId: string): Promise<ActionResult> {
  const { supabase, userId, error: authError } = await assertAdmin();
  if (authError || !supabase || !userId) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  try {
    // Get the request to find the user_id
    const { data: request, error: fetchError } = await supabase
      .from("verification_requests")
      .select("user_id, status")
      .eq("id", requestId)
      .single();

    if (fetchError || !request) {
      console.error("[ServerAction:approveRequest]", {
        adminId: userId,
        requestId,
        error: fetchError?.message ?? "Request not found",
      });
      return { success: false, error: "Verification request not found." };
    }

    if (request.status !== "pending") {
      return { success: false, error: "This request has already been reviewed." };
    }

    // Update the request
    const { error: updateError } = await supabase
      .from("verification_requests")
      .update({
        status: "approved",
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateError) {
      console.error("[ServerAction:approveRequest]", {
        adminId: userId,
        requestId,
        error: updateError.message,
      });
      return { success: false, error: "Failed to approve request." };
    }

    // Update user verification_status
    const { error: userUpdateError } = await supabase
      .from("users")
      .update({ verification_status: "verified" })
      .eq("id", request.user_id);

    if (userUpdateError) {
      console.error("[ServerAction:approveRequest]", {
        adminId: userId,
        requestUserId: request.user_id,
        error: userUpdateError.message,
      });
    }

    revalidatePath("/admin/verification");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:approveRequest]", {
      adminId: userId,
      requestId,
      error: message,
    });
    return { success: false, error: "Something went wrong." };
  }
}

export async function rejectRequest(
  requestId: string,
  reviewMessage: string
): Promise<ActionResult> {
  const { supabase, userId, error: authError } = await assertAdmin();
  if (authError || !supabase || !userId) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  try {
    const { data: request, error: fetchError } = await supabase
      .from("verification_requests")
      .select("user_id, status")
      .eq("id", requestId)
      .single();

    if (fetchError || !request) {
      console.error("[ServerAction:rejectRequest]", {
        adminId: userId,
        requestId,
        error: fetchError?.message ?? "Request not found",
      });
      return { success: false, error: "Verification request not found." };
    }

    if (request.status !== "pending") {
      return { success: false, error: "This request has already been reviewed." };
    }

    const { error: updateError } = await supabase
      .from("verification_requests")
      .update({
        status: "rejected",
        reviewed_by: userId,
        review_message: reviewMessage || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateError) {
      console.error("[ServerAction:rejectRequest]", {
        adminId: userId,
        requestId,
        error: updateError.message,
      });
      return { success: false, error: "Failed to reject request." };
    }

    const { error: userUpdateError } = await supabase
      .from("users")
      .update({ verification_status: "rejected" })
      .eq("id", request.user_id);

    if (userUpdateError) {
      console.error("[ServerAction:rejectRequest]", {
        adminId: userId,
        requestUserId: request.user_id,
        error: userUpdateError.message,
      });
    }

    revalidatePath("/admin/verification");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:rejectRequest]", {
      adminId: userId,
      requestId,
      error: message,
    });
    return { success: false, error: "Something went wrong." };
  }
}

export async function bulkApproveRequests(
  requestIds: string[]
): Promise<ActionResult<{ approved: number; failed: number }>> {
  const { supabase, userId, error: authError } = await assertAdmin();
  if (authError || !supabase || !userId) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  let approved = 0;
  let failed = 0;

  for (const requestId of requestIds) {
    const result = await approveRequest(requestId);
    if (result.success) {
      approved++;
    } else {
      failed++;
    }
  }

  revalidatePath("/admin/verification");
  return { success: true, data: { approved, failed } };
}
