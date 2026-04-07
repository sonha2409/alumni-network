"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

const schema = z.object({
  showLastActive: z.boolean(),
});

/**
 * F45: Toggle `profiles.show_last_active`.
 *
 * When set to false, `get_last_seen()` returns NULL to all viewers (including
 * previously-gated connections) — the server-side gate collapses "hidden" and
 * "never online" into the same outcome, so viewers cannot infer toggling.
 */
export async function updateShowLastActive(
  showLastActive: boolean
): Promise<ActionResult> {
  const parsed = schema.safeParse({ showLastActive });
  if (!parsed.success) {
    return { success: false, error: "Invalid value." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  try {
    const { error } = await supabase
      .from("profiles")
      .update({ show_last_active: parsed.data.showLastActive })
      .eq("user_id", user.id);

    if (error) {
      console.error("[ServerAction:updateShowLastActive]", {
        userId: user.id,
        error: error.message,
      });
      return { success: false, error: "Failed to update setting." };
    }

    revalidatePath("/settings/privacy");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:updateShowLastActive]", {
      userId: user.id,
      error: message,
    });
    return { success: false, error: "Something went wrong." };
  }
}
