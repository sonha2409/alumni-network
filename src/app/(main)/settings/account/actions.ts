"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import {
  accountDeletionRequestedEmail,
  accountReactivatedEmail,
} from "@/lib/email-templates";
import type { ActionResult } from "@/lib/types";

// =============================================================================
// Export account data
// =============================================================================

/**
 * Export all user data as JSON for data portability.
 * Calls the `export_account_data` SECURITY DEFINER function.
 */
export async function exportAccountData(): Promise<ActionResult<string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  try {
    const { data, error } = await supabase.rpc("export_account_data", {
      p_user_id: user.id,
    });

    if (error) {
      console.error("[ServerAction:exportAccountData]", {
        userId: user.id,
        error: error.message,
      });
      return { success: false, error: "Failed to export data. Please try again." };
    }

    return { success: true, data: JSON.stringify(data, null, 2) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:exportAccountData]", {
      userId: user.id,
      error: message,
    });
    return { success: false, error: "Something went wrong." };
  }
}

// =============================================================================
// Request account deletion
// =============================================================================

const deletionSchema = z.object({
  password: z.string().min(1, "Password is required"),
  reason: z.string().max(500).optional(),
});

/**
 * Self-service account deletion. Requires password confirmation.
 * Soft-deletes the account with a 30-day grace period.
 */
export async function requestAccountDeletion(
  formData: FormData
): Promise<ActionResult> {
  const parsed = deletionSchema.safeParse({
    password: formData.get("password"),
    reason: formData.get("reason") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please provide your password to confirm deletion.",
      fieldErrors: { password: ["Password is required"] },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  // Verify password by attempting sign-in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: parsed.data.password,
  });

  if (signInError) {
    return {
      success: false,
      error: "Incorrect password.",
      fieldErrors: { password: ["Incorrect password"] },
    };
  }

  try {
    // Get user's display name for the email
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    const userName = profile?.full_name ?? "User";

    // Call the SECURITY DEFINER function for atomic soft-delete
    const { error: deleteError } = await supabase.rpc(
      "request_account_deletion",
      {
        p_user_id: user.id,
        p_reason: parsed.data.reason ?? null,
      }
    );

    if (deleteError) {
      console.error("[ServerAction:requestAccountDeletion]", {
        userId: user.id,
        error: deleteError.message,
      });
      return { success: false, error: "Failed to delete account. Please try again." };
    }

    // Send confirmation email (fire-and-forget)
    const emailTemplate = accountDeletionRequestedEmail(userName, 30, user.id);
    sendEmail(user.email!, emailTemplate.subject, emailTemplate.html).catch(
      (err) => {
        console.error("[ServerAction:requestAccountDeletion:email]", {
          userId: user.id,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    );

    // Sign out the user
    await supabase.auth.signOut();

    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:requestAccountDeletion]", {
      userId: user.id,
      error: message,
    });
    return { success: false, error: "Something went wrong." };
  }
}

// =============================================================================
// Cancel account deletion (reactivation)
// =============================================================================

/**
 * Cancel a pending account deletion and reactivate the account.
 * Only works during the 30-day grace period.
 */
export async function cancelAccountDeletion(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  try {
    // Get user info before reactivation
    const { data: userData } = await supabase
      .from("users")
      .select("email, deleted_at")
      .eq("id", user.id)
      .single();

    if (!userData || !userData.deleted_at) {
      return { success: false, error: "Account is not in deletion grace period." };
    }

    // Check if grace period has expired
    const deletedAt = new Date(userData.deleted_at);
    const gracePeriodEnd = new Date(
      deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000
    );
    if (new Date() > gracePeriodEnd) {
      return {
        success: false,
        error: "The 30-day grace period has expired. Your account cannot be reactivated.",
      };
    }

    // Get user's display name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    const userName = profile?.full_name ?? "User";

    // Call the SECURITY DEFINER function
    const { error: cancelError } = await supabase.rpc(
      "cancel_account_deletion",
      { p_user_id: user.id }
    );

    if (cancelError) {
      console.error("[ServerAction:cancelAccountDeletion]", {
        userId: user.id,
        error: cancelError.message,
      });
      return { success: false, error: "Failed to reactivate account. Please try again." };
    }

    // Send reactivation email (fire-and-forget)
    const emailTemplate = accountReactivatedEmail(userName);
    sendEmail(userData.email, emailTemplate.subject, emailTemplate.html).catch(
      (err) => {
        console.error("[ServerAction:cancelAccountDeletion:email]", {
          userId: user.id,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    );

    revalidatePath("/");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:cancelAccountDeletion]", {
      userId: user.id,
      error: message,
    });
    return { success: false, error: "Something went wrong." };
  }
}
