"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

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

const stalenessSchema = z.object({
  staleness_months: z.coerce.number().int().min(0).max(60),
});

export async function updateStalenessThreshold(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { supabase, userId, error: authError } = await assertAdmin();
  if (authError || !supabase || !userId) {
    return { success: false, error: authError ?? "Unauthorized" };
  }

  const parsed = stalenessSchema.safeParse({
    staleness_months: formData.get("staleness_months"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please enter a valid number between 0 and 60.",
    };
  }

  try {
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        {
          key: "profile_staleness_months",
          value: parsed.data.staleness_months,
          updated_by: userId,
        },
        { onConflict: "key" }
      );

    if (error) {
      console.error("[ServerAction:updateStalenessThreshold]", {
        userId,
        error: error.message,
      });
      return { success: false, error: "Failed to update setting." };
    }

    // Audit log
    await supabase.from("admin_audit_log").insert({
      admin_id: userId,
      target_user_id: userId,
      action: "update_app_setting",
      details: {
        key: "profile_staleness_months",
        old_value: null,
        new_value: parsed.data.staleness_months,
      },
    });

    revalidatePath("/admin/settings");
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ServerAction:updateStalenessThreshold]", {
      userId,
      error: message,
    });
    return { success: false, error: "An unexpected error occurred." };
  }
}
