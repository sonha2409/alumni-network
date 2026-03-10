"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult, NotificationType } from "@/lib/types";

const VALID_TYPES: NotificationType[] = [
  "connection_request",
  "connection_accepted",
  "new_message",
  "verification_update",
];

const updatePreferenceSchema = z.object({
  notificationType: z.enum([
    "connection_request",
    "connection_accepted",
    "new_message",
    "verification_update",
  ] as const),
  emailEnabled: z.boolean(),
});

/**
 * Update a single notification preference (email enabled/disabled).
 * Upserts — creates the row if it doesn't exist.
 */
export async function updateNotificationPreference(
  notificationType: string,
  emailEnabled: boolean
): Promise<ActionResult> {
  const parsed = updatePreferenceSchema.safeParse({
    notificationType,
    emailEnabled,
  });
  if (!parsed.success) {
    return { success: false, error: "Invalid notification type." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  try {
    const { error } = await supabase.from("notification_preferences").upsert(
      {
        user_id: user.id,
        notification_type: parsed.data.notificationType,
        email_enabled: parsed.data.emailEnabled,
      },
      {
        onConflict: "user_id,notification_type",
      }
    );

    if (error) {
      console.error("[ServerAction:updateNotificationPreference]", {
        userId: user.id,
        notificationType,
        error: error.message,
      });
      return { success: false, error: "Failed to update preference." };
    }

    revalidatePath("/settings/notifications");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:updateNotificationPreference]", {
      userId: user.id,
      error: message,
    });
    return { success: false, error: "Something went wrong." };
  }
}
