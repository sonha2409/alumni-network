"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { locales, type Locale } from "@/i18n/config";
import type { ActionResult } from "@/lib/types";

export async function updateLanguagePreference(
  locale: Locale
): Promise<ActionResult> {
  if (!locales.includes(locale)) {
    return { success: false, error: "Invalid language." };
  }

  const cookieStore = await cookies();

  // Always set the cookie (works for both authenticated and unauthenticated users)
  cookieStore.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });

  // If authenticated, also persist to DB
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { error } = await supabase
      .from("users")
      .update({ preferred_language: locale })
      .eq("id", user.id);

    if (error) {
      console.error("[ServerAction:updateLanguagePreference]", {
        userId: user.id,
        error: error.message,
      });
      // Cookie is already set, so UI will update. DB sync failure is non-critical.
    }
  }

  return { success: true, data: undefined };
}
